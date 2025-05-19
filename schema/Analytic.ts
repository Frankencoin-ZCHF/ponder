import { onchainTable } from 'ponder';

export const AnalyticTransactionLog = onchainTable('TransactionLog', (t) => ({
	id: t.text().primaryKey(),
	count: t.bigint().notNull(),
	timestamp: t.bigint().notNull(),
	kind: t.text().notNull(),
	amount: t.bigint().notNull(),
	txHash: t.hex().notNull(),

	totalInflow: t.bigint().notNull(),
	totalOutflow: t.bigint().notNull(),
	totalTradeFee: t.bigint().notNull(),

	totalSupply: t.bigint().notNull(),
	totalEquity: t.bigint().notNull(),
	totalSavings: t.bigint().notNull(),

	fpsTotalSupply: t.bigint().notNull(),
	fpsPrice: t.bigint().notNull(), // smart contract price

	totalMintedV1: t.bigint().notNull(),
	totalMintedV2: t.bigint().notNull(),

	currentLeadRate: t.bigint().notNull(),
	claimableInterests: t.bigint().notNull(),
	projectedInterests: t.bigint().notNull(),

	annualV1Interests: t.bigint().notNull(),
	annualV2Interests: t.bigint().notNull(),
	annualV1BorrowRate: t.bigint().notNull(),
	annualV2BorrowRate: t.bigint().notNull(),

	annualNetEarnings: t.bigint().notNull(),
	realizedNetEarnings: t.bigint().notNull(),

	// @dev: E = ∑ (delta_earnings_n / totalSupplyFPS_n, n = 0, ...) = ( d0 / t0 ) + ( d1 / t1 ) ... + ( dn / tn )
	// if (dn > 0) then 'profit' aka '+' else 'loss' aka '-'
	earningsPerFPS: t.bigint().notNull(),
}));

export const AnalyticDailyLog = onchainTable('DailyLog', (t) => ({
	id: t.text().primaryKey(),
	timestamp: t.bigint().notNull(),
	txHash: t.hex().notNull(),

	totalInflow: t.bigint().notNull(),
	totalOutflow: t.bigint().notNull(),
	totalTradeFee: t.bigint().notNull(),

	totalSupply: t.bigint().notNull(),
	totalEquity: t.bigint().notNull(),
	totalSavings: t.bigint().notNull(),

	fpsTotalSupply: t.bigint().notNull(),
	fpsPrice: t.bigint().notNull(), // smart contract price

	totalMintedV1: t.bigint().notNull(),
	totalMintedV2: t.bigint().notNull(),

	currentLeadRate: t.bigint().notNull(),
	claimableInterests: t.bigint().notNull(),
	projectedInterests: t.bigint().notNull(),

	annualV1Interests: t.bigint().notNull(),
	annualV2Interests: t.bigint().notNull(),
	annualV1BorrowRate: t.bigint().notNull(),
	annualV2BorrowRate: t.bigint().notNull(),

	annualNetEarnings: t.bigint().notNull(),
	realizedNetEarnings: t.bigint().notNull(),
	earningsPerFPS: t.bigint().notNull(),
}));
