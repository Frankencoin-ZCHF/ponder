import { onchainTable } from '@ponder/core';

export const SavingsRateProposed = onchainTable('SavingsRateProposed', (t) => ({
	id: t.text().primaryKey(),
	created: t.bigint(),
	blockheight: t.bigint(),
	txHash: t.hex(),
	proposer: t.hex(),
	nextRate: t.integer(),
	nextChange: t.integer(),
}));

export const SavingsRateChanged = onchainTable('SavingsRateChanged', (t) => ({
	id: t.text().primaryKey(),
	created: t.bigint(),
	blockheight: t.bigint(),
	txHash: t.hex(),
	approvedRate: t.integer(),
}));

export const SavingsBalance = onchainTable('SavingsBalance', (t) => ({
	id: t.text().primaryKey(), // address in lower case
	created: t.bigint(), // first timestamp
	blockheight: t.bigint(), // first blockheight
	updated: t.bigint(),
	interest: t.bigint(),
	balance: t.bigint(), // balance of account
}));

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
