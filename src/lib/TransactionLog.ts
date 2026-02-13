import { and, or, eq, gt, gte, inArray } from 'ponder';
import { type Context } from 'ponder:registry';
import { AnalyticTransactionLog, AnalyticDailyLog, CommonEcosystem, PositionAggregatesV1, PositionAggregatesV2 } from 'ponder:schema';
import { EquityABI, FrankencoinABI, SavingsABI, SavingsV2ABI } from '@frankencoin/zchf';
import { Address, parseEther, parseUnits } from 'viem';
import { addr, config } from '../../ponder.config';
import { mainnet } from 'viem/chains';

// Time constants for efficient date calculations using BigInt arithmetic
const ONE_DAY_SECONDS = 86400n;
const ONE_YEAR_SECONDS = 365n * ONE_DAY_SECONDS;

interface updateTransactionLogProps {
	client: Context['client'];
	db: Context['db'];
	chainId: number;
	timestamp: bigint;
	kind: string;
	amount: bigint;
	txHash: string;
}

/**
 * @dev: update transaction log for mainnet only
 * this function need a rebuild to reflect multichain data.
 */
export async function updateTransactionLog({ client, db, chainId, timestamp, kind, amount, txHash }: updateTransactionLogProps) {
	if (chainId != mainnet.id) return;

	const mainnetAddress = addr[mainnet.id];

	// Batch query for ecosystem data (single query instead of 8 sequential queries)
	const ecosystemIds = [
		'Equity:Profits',
		'Equity:Losses',
		'Equity:InvestedFeePaidPPM',
		'Equity:RedeemedFeePaidPPM',
		'Equity:EarningsPerFPS',
		'Savings:TotalSaved',
		'Savings:TotalInterestCollected',
		'Savings:TotalWithdrawn',
	];

	const ecosystemRecords = await db.sql.select().from(CommonEcosystem).where(inArray(CommonEcosystem.id, ecosystemIds));

	// Create lookup map for O(1) access
	const ecosystemData = new Map(ecosystemRecords.map((r) => [r.id, r.amount]));

	// Extract values with defaults
	const totalInflow = ecosystemData.get('Equity:Profits') ?? 0n;
	const totalOutflow = ecosystemData.get('Equity:Losses') ?? 0n;
	const investedFeePaid = (ecosystemData.get('Equity:InvestedFeePaidPPM') ?? 0n) / 1_000_000n;
	const redeemedFeePaid = (ecosystemData.get('Equity:RedeemedFeePaidPPM') ?? 0n) / 1_000_000n;
	const totalTradeFee = investedFeePaid + redeemedFeePaid;
	const earningsPerFPS = ecosystemData.get('Equity:EarningsPerFPS') ?? 0n;
	const totalSaved = ecosystemData.get('Savings:TotalSaved') ?? 0n;
	const totalInterestCollected = ecosystemData.get('Savings:TotalInterestCollected') ?? 0n;
	const totalWithdrawn = ecosystemData.get('Savings:TotalWithdrawn') ?? 0n;
	const totalSavings = totalSaved + totalInterestCollected - totalWithdrawn;

	const totalSupply = await client.readContract({
		abi: FrankencoinABI,
		address: mainnetAddress.frankencoin,
		functionName: 'totalSupply',
	});

	const totalEquity = await client.readContract({
		abi: FrankencoinABI,
		address: mainnetAddress.frankencoin,
		functionName: 'equity',
	});

	const fpsTotalSupply = await client.readContract({
		abi: EquityABI,
		address: mainnetAddress.equity,
		functionName: 'totalSupply',
	});

	const fpsPrice = await client.readContract({
		abi: EquityABI,
		address: mainnetAddress.equity,
		functionName: 'price',
	});

	// Fetch both mint lead rate (for V2 positions) and save lead rate (for savings)
	let currentMintLeadRate: bigint = 0n;
	let currentSaveLeadRate: bigint = 0n;
	let projectedInterests: bigint = 0n;

	// Fetch mint lead rate from SavingsV2
	try {
		const mintRatePPM = await client.readContract({
			abi: SavingsV2ABI,
			address: mainnetAddress.savingsV2,
			functionName: 'currentRatePPM',
		});
		currentMintLeadRate = BigInt(mintRatePPM);
	} catch (error) {
		// currentMintLeadRate remains 0n
	}

	// Fetch save lead rate from SavingsReferral
	try {
		const saveRatePPM = await client.readContract({
			abi: SavingsABI,
			address: mainnetAddress.savingsReferral,
			functionName: 'currentRatePPM',
		});
		currentSaveLeadRate = BigInt(saveRatePPM);
	} catch (error) {
		// Fallback: if save rate unavailable, use mint rate
		currentSaveLeadRate = currentMintLeadRate;
	}

	// Calculate projected interests using save rate
	if (totalSavings > 0n && currentSaveLeadRate > 0) {
		projectedInterests = (totalSavings * currentSaveLeadRate) / 1_000_000n;
	}

	// Read V1 aggregates (O(1) instead of O(n))
	const v1Agg = await db.find(PositionAggregatesV1, { chainId });
	const totalMintedV1 = v1Agg?.totalMinted ?? 0n;
	const annualV1Interests = v1Agg?.annualInterests ?? 0n;

	// Read V2 aggregates (O(1) instead of O(n))
	const v2Agg = await db.find(PositionAggregatesV2, { chainId });
	const totalMintedV2 = v2Agg?.totalMinted ?? 0n;
	const annualV2Interests = v2Agg?.annualInterests ?? 0n;

	// avg borrow interest
	const annualV1BorrowRate = totalMintedV1 > 0n ? (annualV1Interests * parseEther('1')) / totalMintedV1 : 0n;
	const annualV2BorrowRate = totalMintedV2 > 0n ? (annualV2Interests * parseEther('1')) / totalMintedV2 : 0n;

	// net calc
	const annualNetEarnings = annualV1Interests + annualV2Interests - projectedInterests;

	// calc realized earnings, rolling latest 365days
	// Use BigInt arithmetic to avoid unnecessary conversions
	const dayTimestamp = timestamp - (timestamp % ONE_DAY_SECONDS);
	const last365dayTimestamp = dayTimestamp - ONE_YEAR_SECONDS;

	const last356dayEntry = await db.sql
		.select()
		.from(AnalyticDailyLog)
		.where(gte(AnalyticDailyLog.timestamp, last365dayTimestamp))
		.orderBy(AnalyticDailyLog.timestamp)
		.limit(1);

	let realizedNetEarnings = totalInflow - totalOutflow;
	if (last356dayEntry.length > 0) {
		const item = last356dayEntry.at(0);
		const inflowAdjusted = totalInflow - item!.totalInflow;
		const outflowAdjusted = totalOutflow - item!.totalOutflow;
		realizedNetEarnings = inflowAdjusted - outflowAdjusted;
	}

	const counter = await db
		.insert(CommonEcosystem)
		.values({
			id: 'Analytics:TransactionLogCounter',
			value: '',
			amount: 1n,
		})
		.onConflictDoUpdate((current) => ({
			amount: current.amount + 1n,
		}));

	await db.insert(AnalyticTransactionLog).values({
		chainId,
		timestamp,
		count: counter.amount,
		kind,
		amount,
		txHash: txHash as `0x${string}`,

		totalInflow,
		totalOutflow,
		totalTradeFee,

		totalSupply,
		totalEquity,
		totalSavings,

		fpsTotalSupply,
		fpsPrice,

		totalMintedV1,
		totalMintedV2,

		currentMintLeadRate,
		currentSaveLeadRate,
		projectedInterests,
		annualV1Interests,
		annualV2Interests,

		annualV1BorrowRate,
		annualV2BorrowRate,

		annualNetEarnings,
		realizedNetEarnings,
		earningsPerFPS,
	});

	// Use BigInt arithmetic to get day boundary (more efficient than Date manipulations)
	const timestampDay = timestamp - (timestamp % ONE_DAY_SECONDS);
	// Only convert to Date for string formatting
	const dateString = new Date(Number(timestampDay) * 1000).toISOString().split('T')[0]!;

	const dailyLogData = {
		date: dateString,
		timestamp: timestampDay,
		txHash: txHash as `0x${string}`,

		totalInflow,
		totalOutflow,
		totalTradeFee,

		totalSupply,
		totalEquity,
		totalSavings,

		fpsTotalSupply,
		fpsPrice,

		totalMintedV1,
		totalMintedV2,

		currentMintLeadRate,
		currentSaveLeadRate,
		projectedInterests,
		annualV1Interests,
		annualV2Interests,

		annualV1BorrowRate,
		annualV2BorrowRate,

		annualNetEarnings,
		realizedNetEarnings,
		earningsPerFPS,
	};

	await db
		.insert(AnalyticDailyLog)
		.values(dailyLogData)
		.onConflictDoUpdate(() => dailyLogData);
}
