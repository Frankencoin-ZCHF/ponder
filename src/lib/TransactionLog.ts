import { and, or, eq, gt, gte } from 'ponder';
import { type Context } from 'ponder:registry';
import { AnalyticTransactionLog, AnalyticDailyLog, CommonEcosystem, MintingHubV1PositionV1, MintingHubV2PositionV2 } from 'ponder:schema';
import { EquityABI, FrankencoinABI, SavingsABI } from '@frankencoin/zchf';
import { Address, parseEther, parseUnits } from 'viem';
import { addr, config } from '../../ponder.config';
import { mainnet } from 'viem/chains';

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

	// Get ecosystem data
	const profitFees = await db.find(CommonEcosystem, { id: `Equity:Profits` });
	const totalInflow = profitFees ? profitFees.amount : 0n;
	const lossFees = await db.find(CommonEcosystem, { id: `Equity:Losses` });
	const totalOutflow = lossFees ? lossFees.amount : 0n;

	const investedFeePaidPPM = await db.find(CommonEcosystem, { id: `Equity:InvestedFeePaidPPM` });
	const investedFeePaid = investedFeePaidPPM ? investedFeePaidPPM.amount / 1_000_000n : 0n;
	const redeemedFeePaidPPM = await db.find(CommonEcosystem, { id: `Equity:RedeemedFeePaidPPM` });
	const redeemedFeePaid = redeemedFeePaidPPM ? redeemedFeePaidPPM.amount / 1_000_000n : 0n;
	const totalTradeFee = investedFeePaid + redeemedFeePaid;

	const _earningsPerFPS = await db.find(CommonEcosystem, { id: `Equity:EarningsPerFPS` });
	const earningsPerFPS = _earningsPerFPS ? _earningsPerFPS.amount : 0n;

	const _totalSaved = await db.find(CommonEcosystem, { id: `Savings:TotalSaved` });
	const totalSaved = _totalSaved ? _totalSaved.amount : 0n;
	const _totalInterestCollected = await db.find(CommonEcosystem, { id: `Savings:TotalInterestCollected` });
	const totalInterestCollected = _totalInterestCollected ? _totalInterestCollected.amount : 0n;
	const _totalWithdrawn = await db.find(CommonEcosystem, { id: `Savings:TotalWithdrawn` });
	const totalWithdrawn = _totalWithdrawn ? _totalWithdrawn.amount : 0n;
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
	} catch (error) {}

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
	const last365dayObj = new Date(parseInt(timestamp.toString()) * 1000 - 365 * 24 * 60 * 60 * 1000);
	const last365dayTimestamp = last365dayObj.setUTCHours(0, 0, 0, 0);

	const last356dayEntry = await db.sql
		.select()
		.from(AnalyticDailyLog)
		.where(gte(AnalyticDailyLog.timestamp, BigInt(last365dayTimestamp)))
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

	const dateObj = new Date(parseInt(timestamp.toString()) * 1000);
	const timestampDay = dateObj.setUTCHours(0, 0, 0, 0);
	const dateString = dateObj.toISOString().split('T').at(0) || dateObj.toISOString();

	const dailyLogData = {
		date: dateString,
		timestamp: BigInt(timestampDay),
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
