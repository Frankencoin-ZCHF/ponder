import { ponder, Context } from '@/generated';
import { EquityABI, FrankencoinABI, SavingsABI } from '@frankencoin/zchf';
import { Address, formatUnits, parseEther, zeroAddress } from 'viem';
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
	const totalProfitFees = profitFees ? profitFees.amount : 0n;
	const lossFees = await eco.findUnique({ id: `Equity:Losses` });
	const totalLossFees = lossFees ? lossFees.amount : 0n;

	const investedFeePaidPPM = await eco.findUnique({ id: `Equity:InvestedFeePaidPPM` });
	const investedFeePaid = investedFeePaidPPM ? investedFeePaidPPM.amount / 1_000_000n : 0n;
	const redeemedFeePaidPPM = await eco.findUnique({ id: `Equity:RedeemedFeePaidPPM` });
	const redeemedFeePaid = redeemedFeePaidPPM ? redeemedFeePaidPPM.amount / 1_000_000n : 0n;
	const totalTradeFees = investedFeePaid + redeemedFeePaid;

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

	const totalSavingsPct = totalSupply > 0n ? (totalSavings * parseEther('1')) / totalSupply : 0n;
	const totalEquityPct = totalSupply > 0n ? (totalEquity * parseEther('1')) / totalSupply : 0n;

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

	let currentLeadratePPM: bigint = 0n;
	let projectedInterests: bigint = 0n;
	if (totalSavings > 0n) {
		const leadRatePPM = await context.client.readContract({
			abi: SavingsABI,
			address: ADDR.savings,
			functionName: 'currentRatePPM',
		});

		currentLeadratePPM = BigInt(leadRatePPM);
		projectedInterests = (totalSavings * currentLeadratePPM) / 1_000_000n;
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
		impliedV2Interests += (p.minted * (BigInt(p.riskPremiumPPM) + currentLeadratePPM)) / 1_000_000n;
		totalMintedV2 += p.minted;
	}

	// avg borrow interest
	const impliedV1AvgBorrowFee = totalMintedV1 > 0n ? (impliedV1Interests * parseEther('1')) / totalMintedV1 : 0n;
	const impliedV2AvgBorrowFee = totalMintedV2 > 0n ? (impliedV2Interests * parseEther('1')) / totalMintedV2 : 0n;

	// net calc
	const netImpliedEarnings = impliedV1Interests + impliedV2Interests - claimableInterests - projectedInterests;
	const netImpliedEarningsPerToken = fpsTotalSupply > 0n ? (netImpliedEarnings * parseEther('1')) / fpsTotalSupply : 0n;
	const netImpliedYieldPerToken = fpsPrice > 0n ? (netImpliedEarningsPerToken * parseEther('1')) / fpsPrice : 0n;

	const entry = await txLog.upsert({
		id: `${timestamp}-${kind}`,
		create: {
			timestamp,
			kind,
			amount,

			totalProfitFees,
			totalLossFees,
			totalTradeFees,

			totalSupply,
			totalEquity,
			totalEquityPct,
			totalSavings,
			totalSavingsPct,

			fpsTotalSupply,
			fpsPrice,

			currentLeadratePPM,
			claimableInterests,
			projectedInterests,
			impliedV1Interests,
			impliedV2Interests,

			impliedV1AvgBorrowFee,
			impliedV2AvgBorrowFee,

			netImpliedEarnings,
			netImpliedEarningsPerToken,
			netImpliedYieldPerToken,
		},
		update: ({ current }) => ({
			timestamp,
			kind,
			amount: current.amount + amount,

			totalProfitFees,
			totalLossFees,
			totalTradeFees,

			totalSupply,
			totalEquity,
			totalEquityPct,
			totalSavings,
			totalSavingsPct,

			fpsTotalSupply,
			fpsPrice,

			currentLeadratePPM,
			claimableInterests,
			projectedInterests,
			impliedV1Interests,
			impliedV2Interests,

			impliedV1AvgBorrowFee,
			impliedV2AvgBorrowFee,

			netImpliedEarnings,
			netImpliedEarningsPerToken,
			netImpliedYieldPerToken,
		}),
	});

	const file = __dirname + '/analytics.csv';

	if (!fs.existsSync(file)) {
		const headers = Object.keys(entry).slice(0, -1).join(', ') + ' \n';
		fs.appendFileSync(file, headers);
	}

	const toStrore = [
		new Date(parseInt(entry.timestamp.toString()) * 1000).toISOString(),
		entry.kind,
		formatUnits(entry.amount, 18),

		formatUnits(entry.totalProfitFees, 18),
		formatUnits(entry.totalLossFees, 18),
		formatUnits(entry.totalTradeFees, 18),

		formatUnits(entry.totalSupply, 18),
		formatUnits(entry.totalEquity, 18),
		formatUnits(entry.totalEquityPct, 16),
		formatUnits(entry.totalSavings, 18),
		formatUnits(entry.totalSavingsPct, 16),

		formatUnits(entry.fpsTotalSupply, 18),
		formatUnits(entry.fpsPrice, 18),

		entry.currentLeadratePPM,
		formatUnits(entry.claimableInterests, 18),
		formatUnits(entry.projectedInterests, 18),
		formatUnits(entry.impliedV1Interests, 18),
		formatUnits(entry.impliedV2Interests, 18),

		formatUnits(entry.impliedV1AvgBorrowFee, 18),
		formatUnits(entry.impliedV2AvgBorrowFee, 18),

		formatUnits(entry.netImpliedEarnings, 18),
		formatUnits(entry.netImpliedEarningsPerToken, 18),
		formatUnits(entry.netImpliedYieldPerToken, 18),
	];

	const appendWith = toStrore.join(', ') + ' \n';
	fs.appendFileSync(__dirname + '/analytics.csv', appendWith);
}
