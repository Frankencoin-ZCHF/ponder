import { onchainTable } from '@ponder/core';

export const EquityBalanceMapping = onchainTable('BalanceMapping', (t) => ({
	id: t.hex().primaryKey(),
	amount: t.bigint().notNull(),
}));

export const EquityBalanceHistory = onchainTable('BalanceHistory', (t) => ({
	id: t.text().primaryKey(),
	count: t.bigint().notNull(),
	created: t.bigint().notNull(),
	txHash: t.hex().notNull(),
	from: t.hex().notNull(),
	to: t.hex().notNull(),
	amount: t.bigint().notNull(),
	balanceFrom: t.bigint().notNull(),
	balanceTo: t.bigint().notNull(),
}));

export const EquityVotingPower = onchainTable('VotingPower', (t) => ({
	id: t.hex().primaryKey(),
	address: t.hex().notNull(),
	votingPower: t.bigint().notNull(),
}));

export const EquityDelegation = onchainTable('Delegation', (t) => ({
	id: t.hex().primaryKey(),
	owner: t.hex().notNull(),
	delegatedTo: t.hex().notNull(),
}));

export const EquityTrade = onchainTable('Trade', (t) => ({
	id: t.text().primaryKey(),
	count: t.bigint().notNull(),
	trader: t.hex().notNull(),
	amount: t.bigint().notNull(),
	shares: t.bigint().notNull(),
	price: t.bigint().notNull(),
	time: t.bigint().notNull(),
}));

export const EquityTradeChart = onchainTable('TradeChart', (t) => ({
	id: t.text().primaryKey(),
	time: t.bigint().notNull(),
	lastPrice: t.bigint().notNull(),
}));
