import { onchainTable } from 'ponder';

export const FrankencoinMinter = onchainTable('Minter', (t) => ({
	id: t.text().primaryKey(),
	txHash: t.hex().notNull(),
	minter: t.hex().notNull(),
	applicationPeriod: t.bigint().notNull(),
	applicationFee: t.bigint().notNull(),
	applyMessage: t.text().notNull(),
	applyDate: t.bigint().notNull(),
	suggestor: t.hex().notNull(),
	denyMessage: t.text(),
	denyDate: t.bigint(),
	denyTxHash: t.hex(),
	vetor: t.hex(),
}));

export const FrankencoinProfitLoss = onchainTable('ProfitLoss', (t) => ({
	id: t.text().primaryKey(),
	count: t.bigint().notNull(),
	created: t.bigint().notNull(),
	kind: t.text().notNull(),
	amount: t.bigint().notNull(),
	perFPS: t.bigint().notNull(),
}));
