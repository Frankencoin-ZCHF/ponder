import { onchainTable } from 'ponder';

export const RollerRolled = onchainTable('RollerRolled', (t) => ({
	id: t.text().primaryKey(),
	created: t.bigint().notNull(),
	blockheight: t.bigint().notNull(),
	owner: t.hex().notNull(),
	source: t.hex().notNull(),
	collWithdraw: t.bigint().notNull(),
	repay: t.bigint().notNull(),
	target: t.hex().notNull(),
	collDeposit: t.bigint().notNull(),
	mint: t.bigint().notNull(),
}));
