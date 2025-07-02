import { onchainTable, primaryKey } from 'ponder';

export const RollerRolled = onchainTable(
	'RollerRolled',
	(t) => ({
		created: t.bigint().notNull(),
		count: t.bigint().notNull(),
		blockheight: t.bigint().notNull(),
		owner: t.hex().notNull(),
		source: t.hex().notNull(),
		collWithdraw: t.bigint().notNull(),
		repay: t.bigint().notNull(),
		target: t.hex().notNull(),
		collDeposit: t.bigint().notNull(),
		mint: t.bigint().notNull(),
	}),
	(table) => ({
		pk: primaryKey({
			columns: [table.source, table.target, table.count],
		}),
	})
);
