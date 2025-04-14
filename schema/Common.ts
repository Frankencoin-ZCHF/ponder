import { onchainTable } from '@ponder/core';

export const CommonActiveUser = onchainTable('ActiveUser', (t) => ({
	id: t.text().primaryKey(),
	lastActiveTime: t.bigint().notNull(),
}));

export const CommonEcosystem = onchainTable('Ecosystem', (t) => ({
	id: t.text().primaryKey(),
	value: t.text(),
	amount: t.bigint(),
}));
