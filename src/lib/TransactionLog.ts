import { and, or, eq, gt, gte, inArray } from 'ponder';
import { type Context } from 'ponder:registry';
import { AnalyticTransactionLog, AnalyticDailyLog, CommonEcosystem, MintingHubV1PositionV1, MintingHubV2PositionV2 } from 'ponder:schema';
import { EquityABI, FrankencoinABI, SavingsABI } from '@frankencoin/zchf';
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

	let currentLeadRatePPM: number = 0;
	let currentLeadRate: bigint = 0n;
	let projectedInterests: bigint = 0n;

	try {
		if (totalSavings > 0n) {
			const leadRatePPM = await client.readContract({
				abi: SavingsABI,
				address: mainnetAddress.savingsReferral,
				functionName: 'currentRatePPM',
			});

			currentLeadRate = parseUnits(leadRatePPM.toString(), 12);
			currentLeadRatePPM = leadRatePPM;
			projectedInterests = (totalSavings * BigInt(leadRatePPM)) / 1_000_000n;
		}
	} catch (error) {
		console.error('Failed to read currentRatePPM from savings contract:', {
			chainId,
			error: error instanceof Error ? error.message : String(error),
		});
		// Continue with default values (currentLeadRate, currentLeadRatePPM, projectedInterests remain 0n)
	}

	// V1
	const openPositionV1 = await db.sql
		.select()
		.from(MintingHubV1PositionV1)
		.where(
			and(eq(MintingHubV1PositionV1.closed, false), eq(MintingHubV1PositionV1.denied, false), gt(MintingHubV1PositionV1.minted, 0n))
		);
	let annualV1Interests: bigint = 0n;
	let totalMintedV1: bigint = 0n;
	for (let p of openPositionV1) {
		annualV1Interests += (p.minted * BigInt(p.annualInterestPPM)) / 1_000_000n;
		totalMintedV1 += p.minted;
	}

	// V2
	const openPositionV2 = await db.sql
		.select()
		.from(MintingHubV2PositionV2)
		.where(
			and(eq(MintingHubV2PositionV2.closed, false), eq(MintingHubV2PositionV2.denied, false), gt(MintingHubV2PositionV2.minted, 0n))
		);
	let annualV2Interests: bigint = 0n;
	let totalMintedV2: bigint = 0n;
	for (let p of openPositionV2) {
		annualV2Interests += (p.minted * BigInt(p.riskPremiumPPM + currentLeadRatePPM)) / 1_000_000n;
		totalMintedV2 += p.minted;
	}

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

		currentLeadRate,
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

		currentLeadRate,
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
