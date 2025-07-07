import { onchainTable, primaryKey } from 'ponder';

// status

export const SavingsStatus = onchainTable(
	'SavingsStatus',
	(t) => ({
		chainId: t.integer().notNull(), // chain id
		module: t.hex().notNull(), // savings contract
		updated: t.bigint().notNull(), // latest timestamp
		save: t.bigint().notNull(), // accum. into savings
		withdraw: t.bigint().notNull(), // accum. into withdraw
		interest: t.bigint().notNull(), // accum. into interest paid
		balance: t.bigint().notNull(), // current balance excl. accuring real-time interest
		rate: t.integer().notNull(), // current applied rate
		counterSave: t.bigint().notNull(),
		counterWithdraw: t.bigint().notNull(),
		counterInterest: t.bigint().notNull(),
		counterRateProposed: t.bigint().notNull(),
		counterRateChanged: t.bigint().notNull(),
	}),
	(table) => ({
		pk: primaryKey({ columns: [table.chainId, table.module] }),
	})
);

// leadrate

export const LeadrateRateChanged = onchainTable(
	'LeadrateRateChanged',
	(t) => ({
		chainId: t.integer().notNull(),
		created: t.bigint().notNull(),
		blockheight: t.bigint().notNull(),
		count: t.bigint().notNull(),
		module: t.text().notNull(),
		txHash: t.hex().notNull(),
		approvedRate: t.integer().notNull(),
	}),
	(table) => ({
		pk: primaryKey({ columns: [table.chainId, table.module, table.count] }),
	})
);

export const LeadRateProposed = onchainTable(
	'LeadRateProposed',
	(t) => ({
		chainId: t.integer().notNull(),
		created: t.bigint().notNull(),
		blockheight: t.bigint().notNull(),
		count: t.bigint().notNull(),
		module: t.text().notNull(),
		txHash: t.hex().notNull(),
		proposer: t.hex().notNull(),
		nextRate: t.integer().notNull(),
		nextChange: t.integer().notNull(),
	}),
	(table) => ({
		pk: primaryKey({ columns: [table.chainId, table.module, table.count] }),
	})
);

// savings module

export const SavingsBalance = onchainTable(
	'SavingsBalance',
	(t) => ({
		chainId: t.integer().notNull(),
		module: t.text().notNull(),
		created: t.bigint(), // first timestamp
		blockheight: t.bigint(), // first blockheight
		updated: t.bigint(),
		interest: t.bigint(),
		balance: t.bigint(), // balance of account
	}),
	(table) => ({
		pk: primaryKey({ columns: [table.chainId, table.module] }),
	})
);

export const SavingsSaved = onchainTable('SavingsSaved', (t) => ({
	id: t.text().primaryKey(),
	created: t.bigint(),
	blockheight: t.bigint(),
	txHash: t.hex(),
	account: t.hex(),
	amount: t.bigint(),
	rate: t.integer(),
	total: t.bigint(),
	balance: t.bigint(),
}));

export const SavingsSavedMapping = onchainTable('SavingsSavedMapping', (t) => ({
	id: t.text().primaryKey(), // address in lower case
	created: t.bigint(), // first timestamp
	blockheight: t.bigint(), // first blockheight
	updated: t.bigint(), // latest timestamp
	amount: t.bigint(), // total amount
}));

export const SavingsInterest = onchainTable('SavingsInterest', (t) => ({
	id: t.text().primaryKey(),
	created: t.bigint(),
	blockheight: t.bigint(),
	txHash: t.hex(),
	account: t.hex(),
	amount: t.bigint(),
	rate: t.integer(),
	total: t.bigint(),
	balance: t.bigint(),
}));

export const SavingsInterestMapping = onchainTable('SavingsInterestMapping', (t) => ({
	id: t.text().primaryKey(),
	created: t.bigint(),
	blockheight: t.bigint(),
	updated: t.bigint(),
	amount: t.bigint(),
}));

export const SavingsWithdrawn = onchainTable('SavingsWithdrawn', (t) => ({
	id: t.text().primaryKey(),
	created: t.bigint(),
	blockheight: t.bigint(),
	txHash: t.hex(),
	account: t.hex(),
	amount: t.bigint(),
	rate: t.integer(),
	total: t.bigint(),
	balance: t.bigint(),
}));

export const SavingsWithdrawnMapping = onchainTable('SavingsWithdrawnMapping', (t) => ({
	id: t.text().primaryKey(),
	created: t.bigint(),
	blockheight: t.bigint(),
	updated: t.bigint(),
	amount: t.bigint(),
}));
