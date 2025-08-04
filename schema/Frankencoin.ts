import { onchainTable, primaryKey } from 'ponder';

export const FrankencoinMinter = onchainTable(
	'FrankencoinMinter',
	(t) => ({
		chainId: t.integer().notNull(),
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
	}),
	(table) => ({
		pk: primaryKey({ columns: [table.chainId, table.minter] }),
	})
);

export const FrankencoinProfitLoss = onchainTable(
	'FrankencoinProfitLoss',
	(t) => ({
		chainId: t.integer().notNull(),
		minter: t.hex().notNull(),
		created: t.bigint().notNull(),
		count: t.bigint().notNull(),
		kind: t.text().notNull(),
		amount: t.bigint().notNull(),
		profits: t.bigint().notNull(),
		losses: t.bigint().notNull(),
	}),
	(table) => ({
		pk: primaryKey({ columns: [table.chainId, table.minter, table.created, table.count] }),
	})
);
