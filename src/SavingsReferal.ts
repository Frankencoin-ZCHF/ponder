import { LeadrateABI } from '@frankencoin/zchf';
import { ponder } from 'ponder:registry';
import { SavingsInterest, SavingsMapping, SavingsSaved, SavingsStatus, SavingsWithdrawn } from 'ponder:schema';
import { Address } from 'viem';

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

	// flat indexing
	await context.db.insert(SavingsSaved).values({
		chainId,
		module,
		account,
		created: updated,
		blockheight: event.block.number,
		count: mapping.counterSave,
		txHash: event.transaction.hash,
		amount,
		rate: ratePPM,
		save: mapping.save,
		withdraw: mapping.withdraw,
		interest: mapping.interest,
		balance: mapping.balance,
	});

	// 	await updateTransactionLog({
	// 	context,
	// 	timestamp: event.block.timestamp,
	// 	kind: 'Savings:Saved',
	// 	amount: event.args.amount,
	// 	txHash: event.transaction.hash,
	// });
});

ponder.on('SavingsReferal:InterestCollected', async ({ event, context }) => {
	const { client } = context;
	const { interest } = event.args;

	const updated = event.block.timestamp;
	const chainId = context.chain.id;
	const module = event.log.address.toLowerCase() as Address;
	const account: Address = event.args.account.toLowerCase() as Address;

	const ratePPM = await client.readContract({
		abi: LeadrateABI,
		address: module,
		functionName: 'currentRatePPM',
	});

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

	// flat indexing
	await context.db.insert(SavingsInterest).values({
		chainId,
		module,
		account,
		created: updated,
		blockheight: event.block.number,
		count: mapping.counterInterest,
		txHash: event.transaction.hash,
		amount: interest,
		rate: ratePPM,
		save: mapping.save,
		withdraw: mapping.withdraw,
		interest: mapping.interest,
		balance: mapping.balance,
	});

	// 	await updateTransactionLog({
	// 	context,
	// 	timestamp: event.block.timestamp,
	// 	kind: 'Savings:InterestCollected',
	// 	amount: event.args.interest,
	// 	txHash: event.transaction.hash,
	// });
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

	// flat indexing
	await context.db.insert(SavingsWithdrawn).values({
		chainId,
		module,
		account,
		created: updated,
		blockheight: event.block.number,
		count: mapping.counterWithdraw,
		txHash: event.transaction.hash,
		amount: amount,
		rate: ratePPM,
		save: mapping.save,
		withdraw: mapping.withdraw,
		interest: mapping.interest,
		balance: mapping.balance,
	});

	// 	await updateTransactionLog({
	// 	context,
	// 	timestamp: event.block.timestamp,
	// 	kind: 'Savings:Withdrawn',
	// 	amount: event.args.amount,
	// 	txHash: event.transaction.hash,
	// });
});
