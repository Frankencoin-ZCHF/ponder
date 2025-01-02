import { ponder, Context } from '@/generated';
import { EquityABI, FrankencoinABI, SavingsABI } from '@frankencoin/zchf';
import { Address, formatUnits, parseEther, parseUnits, zeroAddress } from 'viem';
import { ADDR } from '../ponder.config';
import fs from 'fs';

interface updateTransactionLogProps {
	context: Context;
	timestamp: bigint;
	kind: string;
	amount: bigint;
}

export async function updateTransactionLog({ context, timestamp, kind, amount }: updateTransactionLogProps) {
	const txLog = context.db.TransactionLog;
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

	const savingsToSupplyRatio = totalSupply > 0n ? (totalSavings * parseEther('1')) / totalSupply : 0n;
	const equityToSupplyRatio = totalSupply > 0n ? (totalEquity * parseEther('1')) / totalSupply : 0n;

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
	let impliedV1Interests: bigint = 0n;
	let totalMintedV1: bigint = 0n;
	for (let p of openPositionV1) {
		impliedV1Interests += (p.minted * BigInt(p.annualInterestPPM)) / 1_000_000n;
		totalMintedV1 += p.minted;
	}

	// V2
	const allPositionV2 = await context.db.PositionV2.findMany({ limit: 1000 });
	const openPositionV2 = allPositionV2.items.filter((p) => !p.closed && !p.denied && p.minted > 0n);
	let impliedV2Interests: bigint = 0n;
	let totalMintedV2: bigint = 0n;
	for (let p of openPositionV2) {
		impliedV2Interests += (p.minted * BigInt(p.riskPremiumPPM + currentLeadRatePPM)) / 1_000_000n;
		totalMintedV2 += p.minted;
	}

	// V1 + V2 minted supply ratio
	const mintedV1ToSupplyRatio = totalSupply > 0n ? (totalMintedV1 * parseEther('1')) / totalSupply : 0n;
	const mintedV2ToSupplyRatio = totalSupply > 0n ? (totalMintedV2 * parseEther('1')) / totalSupply : 0n;

	// avg borrow interest
	const impliedV1AvgBorrowRate = totalMintedV1 > 0n ? (impliedV1Interests * parseEther('1')) / totalMintedV1 : 0n;
	const impliedV2AvgBorrowRate = totalMintedV2 > 0n ? (impliedV2Interests * parseEther('1')) / totalMintedV2 : 0n;

	// net calc
	const netImpliedEarnings = impliedV1Interests + impliedV2Interests - claimableInterests - projectedInterests;
	const netImpliedEarningsToSupplyRatio = totalSupply > 0n ? (netImpliedEarnings * parseEther('1')) / totalSupply : 0n;
	const netImpliedEarningsToEquityRatio = totalEquity > 0n ? (netImpliedEarnings * parseEther('1')) / totalEquity : 0n;
	const netImpliedEarningsPerToken = fpsTotalSupply > 0n ? (netImpliedEarnings * parseEther('1')) / fpsTotalSupply : 0n;
	const netImpliedEarningsPerTokenYield = fpsPrice > 0n ? (netImpliedEarningsPerToken * parseEther('1')) / fpsPrice : 0n;

	// calc realized earnings, rolling latest 365days
	const filteredProfitLoss = (
		await context.db.ProfitLoss.findMany({
			where: { timestamp: { gt: timestamp - 365n * 86400n } },
			orderBy: { timestamp: 'asc' },
			limit: 1000,
		})
	).items;

	const netRealized365Earnings = filteredProfitLoss.reduce<bigint>((a, b) => (b.kind == 'Profit' ? a + b.amount : a - b.amount), 0n);
	const netRealized365EarningsToSupplyRatio = totalSupply > 0n ? (netRealized365Earnings * parseEther('1')) / totalSupply : 0n;
	const netRealized365EarningsToEquityRatio = totalEquity > 0n ? (netRealized365Earnings * parseEther('1')) / totalEquity : 0n;
	const netRealized365EarningsPerToken = fpsTotalSupply > 0n ? (netRealized365Earnings * parseEther('1')) / fpsTotalSupply : 0n;
	const netRealized365EarningsPerTokenYield = fpsPrice > 0n ? (netRealized365EarningsPerToken * parseEther('1')) / fpsPrice : 0n;

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
			equityToSupplyRatio,
			savingsToSupplyRatio,

			fpsTotalSupply,
			fpsPrice,

			totalMintedV1,
			totalMintedV2,
			mintedV1ToSupplyRatio,
			mintedV2ToSupplyRatio,

			currentLeadRate,
			claimableInterests,
			projectedInterests,
			impliedV1Interests,
			impliedV2Interests,

			impliedV1AvgBorrowRate,
			impliedV2AvgBorrowRate,

			netImpliedEarnings,
			netImpliedEarningsToSupplyRatio,
			netImpliedEarningsToEquityRatio,
			netImpliedEarningsPerToken,
			netImpliedEarningsPerTokenYield,

			netRealized365Earnings,
			netRealized365EarningsToSupplyRatio,
			netRealized365EarningsToEquityRatio,
			netRealized365EarningsPerToken,
			netRealized365EarningsPerTokenYield,
		},
		update: ({ current }) => ({
			timestamp,
			kind,
			amount: current.amount + amount,

			totalInflow,
			totalOutflow,
			totalTradeFee,

			totalSupply,
			totalEquity,
			equityToSupplyRatio,
			totalSavings,
			savingsToSupplyRatio,

			fpsTotalSupply,
			fpsPrice,

			totalMintedV1,
			totalMintedV2,
			mintedV1ToSupplyRatio,
			mintedV2ToSupplyRatio,

			currentLeadRate,
			claimableInterests,
			projectedInterests,
			impliedV1Interests,
			impliedV2Interests,

			impliedV1AvgBorrowRate,
			impliedV2AvgBorrowRate,

			netImpliedEarnings,
			netImpliedEarningsToSupplyRatio,
			netImpliedEarningsToEquityRatio,
			netImpliedEarningsPerToken,
			netImpliedEarningsPerTokenYield,

			netRealized365Earnings,
			netRealized365EarningsToSupplyRatio,
			netRealized365EarningsToEquityRatio,
			netRealized365EarningsPerToken,
			netRealized365EarningsPerTokenYield,
		}),
	});
}
