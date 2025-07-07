import { LeadrateABI } from '@frankencoin/zchf';
import { ponder } from 'ponder:registry';
import { SavingsMapping, SavingsSaved, SavingsStatus } from 'ponder:schema';
import { Address } from 'viem';

/*
Events

Savings:Saved
Savings:InterestCollected
Savings:Withdrawn
*/

ponder.on('Savings:Saved', async ({ event, context }) => {
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
			counterSave: 0n,
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

ponder.on('Savings:InterestCollected', async ({ event, context }) => {
	//
});

ponder.on('Savings:Withdrawn', async ({ event, context }) => {
	//
});
