import { onchainTable, primaryKey } from 'ponder';

export const CommonActiveUser = onchainTable('ActiveUser', (t) => ({
	id: t.text().primaryKey(),
	lastActiveTime: t.bigint().notNull(),
}));

export const CommonEcosystem = onchainTable(
	'CommonEcosystem',
	(t) => ({
		id: t.text().notNull(),
		value: t.text().notNull(),
		amount: t.bigint().notNull(),
	}),
	(table) => ({
		pk: primaryKey({ columns: [table.id] }),
	})
);
