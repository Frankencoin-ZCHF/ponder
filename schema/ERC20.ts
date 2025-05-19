import { onchainTable, primaryKey } from 'ponder';

// status

export const ERC20Status = onchainTable(
	'Status',
	(t) => ({
		token: t.hex().notNull(), // token contract
		updated: t.bigint().notNull(), // latest timestamp
		mint: t.bigint().notNull(), // counters
		burn: t.bigint().notNull(), // counters
		balance: t.bigint().notNull(), // counters
		supply: t.bigint().notNull(), // amount of tokens
	}),
	(table) => ({
		pk: primaryKey({ columns: [table.token] }),
	})
);

// mint and burn indexing

export const ERC20Mint = onchainTable(
	'Mint',
	(t) => ({
		txHash: t.hex(),
		token: t.hex().notNull(),
		created: t.bigint().notNull(),
		blockheight: t.bigint().notNull(),
		count: t.bigint().notNull(),
		to: t.hex().notNull(),
		amount: t.bigint().notNull(),
	}),
	(table) => ({
		pk: primaryKey({ columns: [table.token, table.to, table.count] }),
	})
);

export const ERC20Burn = onchainTable(
	'Burn',
	(t) => ({
		txHash: t.hex(),
		token: t.hex().notNull(),
		created: t.bigint().notNull(),
		blockheight: t.bigint().notNull(),
		count: t.bigint().notNull(),
		from: t.hex().notNull(),
		amount: t.bigint().notNull(),
	}),
	(table) => ({
		pk: primaryKey({ columns: [table.token, table.from, table.count] }),
	})
);

// balance indexing

export const ERC20Balance = onchainTable(
	'Balance',
	(t) => ({
		txHash: t.hex().notNull(),
		token: t.hex().notNull(),
		created: t.bigint().notNull(),
		blockheight: t.bigint().notNull(),
		count: t.bigint().notNull(),
		from: t.hex().notNull(),
		to: t.hex().notNull(),
		amount: t.bigint().notNull(),
		balanceFrom: t.bigint().notNull(),
		balanceTo: t.bigint().notNull(),
	}),
	(table) => ({
		pk: primaryKey({ columns: [table.token, table.count] }),
	})
);

export const ERC20BalanceMapping = onchainTable(
	'Mapping',
	(t) => ({
		token: t.hex().notNull(),
		updated: t.bigint().notNull(),
		account: t.hex().notNull(),
		mint: t.bigint().notNull(),
		burn: t.bigint().notNull(),
		balance: t.bigint().notNull(),
	}),
	(table) => ({
		pk: primaryKey({ columns: [table.token, table.account] }),
	})
);
