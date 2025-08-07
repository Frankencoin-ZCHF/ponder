import { onchainTable, primaryKey } from 'ponder';

export const EquityDelegation = onchainTable(
	'EquityDelegation',
	(t) => ({
		owner: t.hex().notNull(),
		delegatedTo: t.hex().notNull(),
	}),
	(table) => ({
		pk: primaryKey({
			columns: [table.owner],
		}),
	})
);

export const EquityTrade = onchainTable(
	'EquityTrade',
	(t) => ({
		kind: t.text().notNull(),
		count: t.bigint().notNull(),
		trader: t.hex().notNull(),
		amount: t.bigint().notNull(),
		shares: t.bigint().notNull(),
		price: t.bigint().notNull(),
		created: t.bigint().notNull(),
		txHash: t.hex().notNull(),
	}),
	(table) => ({
		pk: primaryKey({
			columns: [table.trader, table.created, table.kind, table.count],
		}),
	})
);

export const EquityTradeChart = onchainTable(
	'EquityTradeChart',
	(t) => ({
		timestamp: t.bigint().notNull(),
		lastPrice: t.bigint().notNull(),
	}),
	(table) => ({
		pk: primaryKey({
			columns: [table.timestamp],
		}),
	})
);
