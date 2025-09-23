import { LeadrateABI, SavingsABI } from '@frankencoin/zchf';
import { ponder } from 'ponder:registry';
import {
	CommonEcosystem,
	SavingsActivity,
	SavingsMapping,
	SavingsReferrerEarnings,
	SavingsReferrerMapping,
	SavingsStatus,
} from 'ponder:schema';
import { Address } from 'viem';
import { updateTransactionLog } from './lib/TransactionLog';

/*
Events

SavingsReferal:Saved
SavingsReferal:InterestCollected
SavingsReferal:Withdrawn
*/

ponder.on('SavingsReferal:Saved', async ({ event, context }) => {
	const { client } = context;
	const { amount } = event.args;

	const updated = event.block.timestamp;
	const chainId = context.chain.id;
	const module = event.log.address.toLowerCase() as Address;
	const account: Address = event.args.account.toLowerCase() as Address;

	const ratePPM = await client.readContract({
		abi: LeadrateABI,
		address: module,
		functionName: 'currentRatePPM',
	});

	const [, , referrer, referrerFee] = await client.readContract({
		abi: SavingsABI,
		address: module,
		functionName: 'savings',
		args: [account],
	});

	// update total saved
	await context.db
		.insert(CommonEcosystem)
		.values({
			id: 'Savings:TotalSaved',
			value: '',
			amount: amount,
		})
		.onConflictDoUpdate((current) => ({
			amount: current.amount + amount,
		}));

	// update global status
	const status = await context.db
		.insert(SavingsStatus)
		.values({
			chainId,
			module,
			updated,
			save: amount,
			withdraw: 0n,
			interest: 0n,
			balance: amount,
			rate: ratePPM,
			counterSave: 1n,
			counterWithdraw: 0n,
			counterInterest: 0n,
			counterRateProposed: 0n,
			counterRateChanged: 0n,
		})
		.onConflictDoUpdate((current) => ({
			updated,
			rate: ratePPM,
			save: current.save + amount,
			balance: current.balance + amount,
			counterSave: current.counterSave + 1n,
		}));

	// update mapping
	const mapping = await context.db
		.insert(SavingsMapping)
		.values({
			chainId,
			module,
			account,
			created: updated,
			updated,
			save: amount,
			withdraw: 0n,
			interest: 0n,
			balance: amount,
			counterSave: 1n,
			counterWithdraw: 0n,
			counterInterest: 0n,
		})
		.onConflictDoUpdate((current) => ({
			updated,
			save: current.save + amount,
			balance: current.balance + amount,
			counterSave: current.counterSave + 1n, // count
		}));

	const counter = mapping.counterSave + mapping.counterInterest + mapping.counterWithdraw;

	// flat indexing
	await context.db.insert(SavingsActivity).values({
		chainId,
		module,
		account,
		created: updated,
		blockheight: event.block.number,
		count: counter,
		txHash: event.transaction.hash,
		kind: 'Saved',
		amount,
		rate: ratePPM,
		save: mapping.save,
		withdraw: mapping.withdraw,
		interest: mapping.interest,
		balance: mapping.balance,
	});

	// referrer mapping indexing
	await context.db
		.insert(SavingsReferrerMapping)
		.values({
			chainId,
			module,
			account,
			created: updated,
			updated,
			referrer,
			referrerFee,
		})
		.onConflictDoUpdate((current) => ({
			updated,
			referrer,
			referrerFee,
		}));

	await updateTransactionLog({
		client: context.client,
		db: context.db,
		chainId,
		timestamp: event.block.timestamp,
		kind: 'Savings:Saved',
		amount: event.args.amount,
		txHash: event.transaction.hash,
	});
});

ponder.on('SavingsReferal:InterestCollected', async ({ event, context }) => {
	const { client } = context;
	const { interest, referrerFee: earnings } = event.args;

	const updated = event.block.timestamp;
	const chainId = context.chain.id;
	const module = event.log.address.toLowerCase() as Address;
	const account: Address = event.args.account.toLowerCase() as Address;

	const ratePPM = await client.readContract({
		abi: LeadrateABI,
		address: module,
		functionName: 'currentRatePPM',
	});

	const [, , referrer, referrerFee] = await client.readContract({
		abi: SavingsABI,
		address: module,
		functionName: 'savings',
		args: [account],
	});

	// update total interest collected
	await context.db
		.insert(CommonEcosystem)
		.values({
			id: 'Savings:TotalInterestCollected',
			value: '',
			amount: interest,
		})
		.onConflictDoUpdate((current) => ({
			amount: current.amount + interest,
		}));

	// update global status
	const status = await context.db.update(SavingsStatus, { chainId, module }).set((current) => ({
		updated,
		rate: ratePPM,
		interest: current.interest + interest,
		balance: current.balance + interest,
		counterInterest: current.counterInterest + 1n,
	}));

	// update mapping
	const mapping = await context.db.update(SavingsMapping, { chainId, module, account }).set((current) => ({
		updated,
		interest: current.interest + interest,
		balance: current.balance + interest,
		counterInterest: current.counterInterest + 1n, // count
	}));

	const counter = mapping.counterSave + mapping.counterInterest + mapping.counterWithdraw;

	// flat indexing
	await context.db.insert(SavingsActivity).values({
		chainId,
		module,
		account,
		created: updated,
		blockheight: event.block.number,
		count: counter,
		txHash: event.transaction.hash,
		kind: 'InterestCollected',
		amount: interest,
		rate: ratePPM,
		save: mapping.save,
		withdraw: mapping.withdraw,
		interest: mapping.interest,
		balance: mapping.balance,
	});

	// referrer mapping indexing
	await context.db
		.insert(SavingsReferrerMapping)
		.values({
			chainId,
			module,
			account,
			created: updated,
			updated,
			referrer,
			referrerFee,
		})
		.onConflictDoUpdate((current) => ({
			updated,
			referrer,
			referrerFee,
		}));

	// referrer earnings indexing
	await context.db
		.insert(SavingsReferrerEarnings)
		.values({
			chainId,
			module,
			account,
			created: updated,
			updated,
			referrer: referrer,
			earnings: earnings,
		})
		.onConflictDoUpdate((current) => ({
			updated,
			earnings: current.earnings + earnings,
		}));

	await updateTransactionLog({
		client: context.client,
		db: context.db,
		chainId,
		timestamp: event.block.timestamp,
		kind: 'Savings:InterestCollected',
		amount: event.args.interest,
		txHash: event.transaction.hash,
	});
});

ponder.on('SavingsReferal:Withdrawn', async ({ event, context }) => {
	const { client } = context;
	const { amount } = event.args;

	const updated = event.block.timestamp;
	const chainId = context.chain.id;
	const module = event.log.address.toLowerCase() as Address;
	const account: Address = event.args.account.toLowerCase() as Address;

	const ratePPM = await client.readContract({
		abi: LeadrateABI,
		address: module,
		functionName: 'currentRatePPM',
	});

	const [, , referrer, referrerFee] = await client.readContract({
		abi: SavingsABI,
		address: module,
		functionName: 'savings',
		args: [account],
	});

	// update total withdrawn
	await context.db
		.insert(CommonEcosystem)
		.values({
			id: 'Savings:TotalWithdrawn',
			value: '',
			amount: amount,
		})
		.onConflictDoUpdate((current) => ({
			amount: current.amount + amount,
		}));

	// update global status
	const status = await context.db.update(SavingsStatus, { chainId, module }).set((current) => ({
		updated,
		rate: ratePPM,
		withdraw: current.withdraw + amount, // double entry
		balance: current.balance - amount, // deduct from balance
		counterWithdraw: current.counterWithdraw + 1n,
	}));

	// update mapping
	const mapping = await context.db.update(SavingsMapping, { chainId, module, account }).set((current) => ({
		updated,
		withdraw: current.withdraw + amount,
		balance: current.balance - amount,
		counterWithdraw: current.counterWithdraw + 1n, // count
	}));

	const counter = mapping.counterSave + mapping.counterInterest + mapping.counterWithdraw;

	// flat indexing
	await context.db.insert(SavingsActivity).values({
		chainId,
		module,
		account,
		created: updated,
		blockheight: event.block.number,
		count: counter,
		txHash: event.transaction.hash,
		kind: 'Withdrawn',
		amount: amount,
		rate: ratePPM,
		save: mapping.save,
		withdraw: mapping.withdraw,
		interest: mapping.interest,
		balance: mapping.balance,
	});

	// referrer mapping indexing
	await context.db
		.insert(SavingsReferrerMapping)
		.values({
			chainId,
			module,
			account,
			created: updated,
			updated,
			referrer,
			referrerFee,
		})
		.onConflictDoUpdate((current) => ({
			updated,
			referrer,
			referrerFee,
		}));

	await updateTransactionLog({
		client: context.client,
		db: context.db,
		chainId,
		timestamp: event.block.timestamp,
		kind: 'Savings:Withdrawn',
		amount: event.args.amount,
		txHash: event.transaction.hash,
	});
});
