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

export const SavingsMapping = onchainTable(
	'SavingsMapping',
	(t) => ({
		chainId: t.integer().notNull(),
		module: t.text().notNull(),
		account: t.text().notNull(),
		created: t.bigint().notNull(), // first timestamp
		updated: t.bigint().notNull(), // latest timestamp
		save: t.bigint().notNull(), // accum. into savings
		withdraw: t.bigint().notNull(), // accum. into withdraw
		interest: t.bigint().notNull(), // accum. into interest paid
		balance: t.bigint().notNull(), // current balance excl. accuring real-time interest
		counterSave: t.bigint().notNull(),
		counterWithdraw: t.bigint().notNull(),
		counterInterest: t.bigint().notNull(),
	}),
	(table) => ({
		pk: primaryKey({ columns: [table.chainId, table.module, table.account] }),
	})
);

export const SavingsSaved = onchainTable(
	'SavingsSaved',
	(t) => ({
		chainId: t.integer().notNull(),
		module: t.text().notNull(),
		account: t.text().notNull(),
		created: t.bigint().notNull(),
		blockheight: t.bigint(),
		count: t.bigint().notNull(),
		txHash: t.hex().notNull(),
		amount: t.bigint().notNull(),
		rate: t.integer().notNull(),
		save: t.bigint().notNull(), // accum. into savings
		withdraw: t.bigint().notNull(), // accum. into withdraw
		interest: t.bigint().notNull(), // accum. into interest paid
		balance: t.bigint().notNull(), // current balance excl. accuring real-time interest
	}),
	(table) => ({
		pk: primaryKey({ columns: [table.chainId, table.module, table.account, table.count] }),
	})
);

export const SavingsInterest = onchainTable(
	'SavingsInterest',
	(t) => ({
		chainId: t.integer().notNull(),
		module: t.text().notNull(),
		account: t.text().notNull(),
		created: t.bigint().notNull(),
		blockheight: t.bigint().notNull(),
		count: t.bigint().notNull(),
		txHash: t.hex().notNull(),
		amount: t.bigint().notNull(),
		rate: t.integer().notNull(),
		save: t.bigint().notNull(), // accum. into savings
		withdraw: t.bigint().notNull(), // accum. into withdraw
		interest: t.bigint().notNull(), // accum. into interest paid
		balance: t.bigint().notNull(), // current balance excl. accuring real-time interest
	}),
	(table) => ({
		pk: primaryKey({ columns: [table.chainId, table.module, table.account, table.count] }),
	})
);

export const SavingsWithdrawn = onchainTable(
	'SavingsWithdrawn',
	(t) => ({
		chainId: t.integer().notNull(),
		module: t.text().notNull(),
		account: t.text().notNull(),
		created: t.bigint().notNull(),
		blockheight: t.bigint(),
		count: t.bigint().notNull(),
		txHash: t.hex().notNull(),
		amount: t.bigint().notNull(),
		rate: t.integer().notNull(),
		save: t.bigint().notNull(), // accum. into savings
		withdraw: t.bigint().notNull(), // accum. into withdraw
		interest: t.bigint().notNull(), // accum. into interest paid
		balance: t.bigint().notNull(), // current balance excl. accuring real-time interest
	}),
	(table) => ({
		pk: primaryKey({ columns: [table.chainId, table.module, table.account, table.count] }),
	})
);
