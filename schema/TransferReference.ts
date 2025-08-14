import { onchainTable, primaryKey } from 'ponder';

export const TransferReference = onchainTable(
	'TransferReference',
	(t) => ({
		chainId: t.integer().notNull(), // chain id
		count: t.bigint().notNull(),
		created: t.bigint().notNull(),
		txHash: t.hex().notNull(),
		sender: t.hex().notNull(),
		from: t.hex().notNull(),
		to: t.hex().notNull(),
		toBytes: t.hex().notNull(),
		targetChain: t.bigint().notNull(),
		amount: t.bigint().notNull(),
		reference: t.text().notNull(),
	}),
	(table) => ({
		pk: primaryKey({
			columns: [table.chainId, table.count],
		}),
	})
);
