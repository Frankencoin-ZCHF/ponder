import { onchainTable, primaryKey } from 'ponder';

// counter

export const ERC20Counter = onchainTable(
	'Counter',
	(t) => ({
		token: t.hex().notNull(),
		updated: t.bigint().notNull(),
		mint: t.bigint().notNull(),
		burn: t.bigint().notNull(),
		balance: t.bigint().notNull(),
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
		count: t.numeric().notNull(),
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
		count: t.numeric().notNull(),
		from: t.hex().notNull(),
		amount: t.bigint().notNull(),
	}),
	(table) => ({
		pk: primaryKey({ columns: [table.token, table.from, table.count] }),
	})
);

export const ERC20MintBurnMapping = onchainTable(
	'MintBurnMapping',
	(t) => ({
		account: t.hex().notNull(),
		updated: t.bigint().notNull(),
		token: t.hex().notNull(),
		mint: t.bigint().notNull(),
		burn: t.bigint().notNull(),
	}),
	(table) => ({
		pk: primaryKey({ columns: [table.account] }),
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
		count: t.numeric().notNull(),
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
		account: t.hex().notNull(),
		updated: t.bigint().notNull(),
		token: t.hex().notNull(),
		balance: t.bigint().notNull(),
	}),
	(table) => ({
		pk: primaryKey({ columns: [table.account] }),
	})
);
