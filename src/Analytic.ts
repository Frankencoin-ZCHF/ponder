import { Context } from '@/generated';
import { EquityABI, FrankencoinABI, SavingsABI } from '@frankencoin/zchf';
import { Address, parseEther, parseUnits } from 'viem';
import { ADDR } from '../ponder.config';

interface updateTransactionLogProps {
	context: Context;
	timestamp: bigint;
	kind: string;
	amount: bigint;
}

export async function updateTransactionLog({ context, timestamp, kind, amount }: updateTransactionLogProps) {
	const txLog = context.db.TransactionLog;
	const dailyLog = context.db.DailyLog;
	const eco = context.db.Ecosystem;

	const profitFees = await eco.findUnique({ id: `Equity:Profits` });
	const totalInflow = profitFees ? profitFees.amount : 0n;
	const lossFees = await eco.findUnique({ id: `Equity:Losses` });
	const totalOutflow = lossFees ? lossFees.amount : 0n;

	const investedFeePaidPPM = await eco.findUnique({ id: `Equity:InvestedFeePaidPPM` });
	const investedFeePaid = investedFeePaidPPM ? investedFeePaidPPM.amount / 1_000_000n : 0n;
	const redeemedFeePaidPPM = await eco.findUnique({ id: `Equity:RedeemedFeePaidPPM` });
	const redeemedFeePaid = redeemedFeePaidPPM ? redeemedFeePaidPPM.amount / 1_000_000n : 0n;
	const totalTradeFee = investedFeePaid + redeemedFeePaid;

	const _totalSaved = await eco.findUnique({ id: `Savings:TotalSaved` });
	const totalSaved = _totalSaved ? _totalSaved.amount : 0n;
	const _totalInterestCollected = await eco.findUnique({ id: `Savings:TotalInterestCollected` });
	const totalInterestCollected = _totalInterestCollected ? _totalInterestCollected.amount : 0n;
	const _totalWithdrawn = await eco.findUnique({ id: `Savings:TotalWithdrawn` });
	const totalWithdrawn = _totalWithdrawn ? _totalWithdrawn.amount : 0n;
	const totalSavings = totalSaved + totalInterestCollected - totalWithdrawn;

	const totalSupply = await context.client.readContract({
		abi: FrankencoinABI,
		address: ADDR.frankenCoin,
		functionName: 'totalSupply',
	});

	const totalEquity = await context.client.readContract({
		abi: FrankencoinABI,
		address: ADDR.frankenCoin,
		functionName: 'equity',
	});

	const fpsTotalSupply = await context.client.readContract({
		abi: EquityABI,
		address: ADDR.equity,
		functionName: 'totalSupply',
	});

	const fpsPrice = await context.client.readContract({
		abi: EquityABI,
		address: ADDR.equity,
		functionName: 'price',
	});

	const savingsSavedMapping = await context.db.SavingsSavedMapping.findMany({ limit: 1000 });
	const savers = savingsSavedMapping.items.map((i) => i.id as Address);

	let claimableInterests: bigint = 0n;
	for (let s of savers) {
		const accruedInterest: bigint = await context.client.readContract({
			abi: SavingsABI,
			address: ADDR.savings,
			functionName: 'accruedInterest',
			args: [s as Address],
		});

		claimableInterests += accruedInterest;
	}

	let currentLeadRatePPM: number = 0;
	let currentLeadRate: bigint = 0n;
	let projectedInterests: bigint = 0n;
	if (totalSavings > 0n) {
		const leadRatePPM = await context.client.readContract({
			abi: SavingsABI,
			address: ADDR.savings,
			functionName: 'currentRatePPM',
		});

		currentLeadRate = parseUnits(leadRatePPM.toString(), 12);
		currentLeadRatePPM = leadRatePPM;
		projectedInterests = (totalSavings * BigInt(leadRatePPM)) / 1_000_000n;
	}

	// V1
	const allPositionV1 = await context.db.PositionV1.findMany({ limit: 1000 });
	const openPositionV1 = allPositionV1.items.filter((p) => !p.closed && !p.denied && p.minted > 0n);
	let annualV1Interests: bigint = 0n;
	let totalMintedV1: bigint = 0n;
	for (let p of openPositionV1) {
		annualV1Interests += (p.minted * BigInt(p.annualInterestPPM)) / 1_000_000n;
		totalMintedV1 += p.minted;
	}

	// V2
	const allPositionV2 = await context.db.PositionV2.findMany({ limit: 1000 });
	const openPositionV2 = allPositionV2.items.filter((p) => !p.closed && !p.denied && p.minted > 0n);
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
	const annualNetEarnings = annualV1Interests + annualV2Interests - claimableInterests - projectedInterests;

	// calc realized earnings, rolling latest 365days
	const last365dayObj = new Date(parseInt(timestamp.toString()) * 1000 - 365 * 24 * 60 * 60 * 1000);
	const last365dayTimestamp = last365dayObj.setUTCHours(0, 0, 0, 0);

	const last356dayEntry = await context.db.DailyLog.findMany({
		where: {
			timestamp: { gte: BigInt(last365dayTimestamp) },
		},
		orderBy: { timestamp: 'asc' },
		limit: 1,
	});

	let realizedNetEarnings = totalInflow - totalOutflow;
	if (last356dayEntry.items.length > 0) {
		const item = last356dayEntry.items.at(0);
		const inflowAdjusted = totalInflow - item!.totalInflow;
		const outflowAdjusted = totalOutflow - item!.totalOutflow;
		realizedNetEarnings = inflowAdjusted - outflowAdjusted;
	}

	const entry = await txLog.upsert({
		id: `${timestamp}-${kind}`,
		create: {
			timestamp,
			kind,
			amount,

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
			claimableInterests,
			projectedInterests,
			annualV1Interests,
			annualV2Interests,

			annualV1BorrowRate,
			annualV2BorrowRate,

			annualNetEarnings,
			realizedNetEarnings,
		},
		update: ({ current }) => ({
			timestamp,
			kind,
			amount,

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
			claimableInterests,
			projectedInterests,
			annualV1Interests,
			annualV2Interests,

			annualV1BorrowRate,
			annualV2BorrowRate,

			annualNetEarnings,
			realizedNetEarnings,
		}),
	});

	const dateObj = new Date(parseInt(timestamp.toString()) * 1000);
	const timestampDay = dateObj.setUTCHours(0, 0, 0, 0);
	const dateString = dateObj.toDateString().split(' ').join('-');

	const dailyEntry = await dailyLog.upsert({
		id: dateString,
		create: {
			timestamp: BigInt(timestampDay),

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
			claimableInterests,
			projectedInterests,
			annualV1Interests,
			annualV2Interests,

			annualV1BorrowRate,
			annualV2BorrowRate,

			annualNetEarnings,
			realizedNetEarnings,
		},
		update: ({ current }) => ({
			timestamp: BigInt(timestampDay),

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
			claimableInterests,
			projectedInterests,
			annualV1Interests,
			annualV2Interests,

			annualV1BorrowRate,
			annualV2BorrowRate,

			annualNetEarnings,
			realizedNetEarnings,
		}),
	});
}
