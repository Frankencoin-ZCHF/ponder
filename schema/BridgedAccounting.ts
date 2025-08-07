import { onchainTable, primaryKey } from 'ponder';

export const BridgedAccountingReceivedSettlement = onchainTable(
	'BridgedAccountingReceivedSettlement',
	(t) => ({
		chain: t.bigint().notNull(),
		sender: t.hex().notNull(),
		created: t.bigint().notNull(),
		count: t.bigint().notNull(),
		kind: t.text().notNull(),
		profits: t.bigint().notNull(),
		losses: t.bigint().notNull(),
	}),
	(table) => ({
		pk: primaryKey({ columns: [table.chain, table.sender, table.count] }),
	})
);
