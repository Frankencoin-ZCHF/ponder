import { onchainTable, primaryKey } from 'ponder';

export const PriceDiscovery = onchainTable(
	'PriceDiscovery',
	(t) => ({
		txHash: t.hex(),
		sender: t.hex(),
		source: t.text().notNull(),
		created: t.bigint().notNull(),
		blockheight: t.bigint().notNull(),
		count: t.bigint().notNull(),
		price: t.bigint().notNull(),
		oracle: t.bigint().notNull(),
	}),
	(table) => ({
		pk: primaryKey({ columns: [table.source, table.blockheight, table.count] }),
	})
);
