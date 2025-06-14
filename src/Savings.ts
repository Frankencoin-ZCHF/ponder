import { ponder } from '@/generated';
import { SavingsABI } from '@frankencoin/zchf';
import { ADDR } from '../ponder.config';
import { Address, parseEther } from 'viem';
import { updateTransactionLog } from './Analytic';

ponder.on('Savings:RateProposed', async ({ event, context }) => {
	const { SavingsRateProposed, Ecosystem } = context.db;
	const { who, nextChange, nextRate } = event.args;

	const counter = await Ecosystem.upsert({
		id: 'Savings:RateProposedCounter',
		create: {
			value: '',
			amount: 1n,
		},
		update: ({ current }) => ({
			amount: current.amount + 1n,
		}),
	});

	// flat indexing
	await SavingsRateProposed.create({
		id: `${who.toLowerCase()}-${event.block.number}-${counter.amount}`,
		data: {
			created: event.block.timestamp,
			blockheight: event.block.number,
			txHash: event.transaction.hash,
			proposer: who,
			nextRate: nextRate,
			nextChange: nextChange,
		},
	});
});

ponder.on('Savings:RateChanged', async ({ event, context }) => {
	const { SavingsRateChanged, Ecosystem } = context.db;
	const { newRate } = event.args;

	const counter = await Ecosystem.upsert({
		id: 'Savings:RateChangedCounter',
		create: {
			value: '',
			amount: 1n,
		},
		update: ({ current }) => ({
			amount: current.amount + 1n,
		}),
	});

	// flat indexing
	await SavingsRateChanged.create({
		id: `${event.block.number}-${counter.amount}`,
		data: {
			created: event.block.timestamp,
			blockheight: event.block.number,
			txHash: event.transaction.hash,
			approvedRate: newRate,
		},
	});

	await updateTransactionLog({
		context,
		timestamp: event.block.timestamp,
		kind: 'Savings:RateChanged',
		amount: parseEther(newRate.toString()),
		txHash: event.transaction.hash,
	});
});

ponder.on('Savings:Saved', async ({ event, context }) => {
	const { client } = context;
	const {
		SavingsBalance,
		SavingsSaved,
		SavingsSavedMapping,
		SavingsWithdrawnMapping,
		SavingsInterestMapping,
		Ecosystem,
	} = context.db;
	const { amount } = event.args;
	const account: Address = event.args.account.toLowerCase() as Address;

	const ratePPM = await client.readContract({
		abi: SavingsABI,
		address: '0x27d9AD987BdE08a0d083ef7e0e4043C857A17B38',
		functionName: 'currentRatePPM',
	});

	// ecosystem
	const counter = await Ecosystem.upsert({
		id: 'Savings:SavedCounter',
		create: {
			value: '',
			amount: 1n,
		},
		update: ({ current }) => ({
			amount: current.amount + 1n,
		}),
	});

	await Ecosystem.upsert({
		id: `Savings:TotalSaved`,
		create: {
			value: '',
			amount: amount,
		},
		update: ({ current }) => ({
			amount: current.amount + amount,
		}),
	});

	// map indexing
	await SavingsSavedMapping.upsert({
		id: account,
		create: {
			created: event.block.timestamp,
			blockheight: event.block.number,
			updated: event.block.timestamp,
			amount,
		},
		update: (c) => ({
			updated: event.block.timestamp,
			amount: c.current.amount + amount,
		}),
	});

	const latestSaved = await SavingsSavedMapping.findUnique({
		id: account,
	});
	const latestWithdraw = await SavingsWithdrawnMapping.findUnique({
		id: account,
	});
	const latestInterest = await SavingsInterestMapping.findUnique({
		id: account,
	});

	const balance: bigint = latestSaved
		? latestSaved.amount -
		  (latestWithdraw ? latestWithdraw.amount : 0n) +
		  (latestInterest ? latestInterest.amount : 0n)
		: 0n;

	// balance indexing
	await SavingsBalance.upsert({
		id: account,
		create: {
			created: event.block.timestamp,
			blockheight: event.block.number,
			updated: event.block.timestamp,
			interest: latestInterest ? latestInterest.amount : 0n,
			balance,
		},
		update: (c) => ({
			updated: event.block.timestamp,
			interest: latestInterest ? latestInterest.amount : 0n,
			balance,
		}),
	});

	// flat indexing
	await SavingsSaved.create({
		id: `${account}-${event.block.number.toString()}-${counter.amount}`,
		data: {
			created: event.block.timestamp,
			blockheight: event.block.number,
			account: account,
			txHash: event.transaction.hash,
			amount,
			rate: ratePPM,
			total: latestSaved ? latestSaved.amount : amount,
			balance,
		},
	});

	await updateTransactionLog({
		context,
		timestamp: event.block.timestamp,
		kind: 'Savings:Saved',
		amount: event.args.amount,
		txHash: event.transaction.hash,
	});
});

ponder.on('Savings:InterestCollected', async ({ event, context }) => {
	const { client } = context;
	const {
		SavingsBalance,
		SavingsInterest,
		SavingsSavedMapping,
		SavingsWithdrawnMapping,
		SavingsInterestMapping,
		Ecosystem,
	} = context.db;
	const { interest } = event.args;
	const account: Address = event.args.account.toLowerCase() as Address;

	const ratePPM = await client.readContract({
		abi: SavingsABI,
		address: '0x27d9AD987BdE08a0d083ef7e0e4043C857A17B38',
		functionName: 'currentRatePPM',
	});

	// ecosystem
	const counter = await Ecosystem.upsert({
		id: 'Savings:InterestCollectedCounter',
		create: {
			value: '',
			amount: 1n,
		},
		update: ({ current }) => ({
			amount: current.amount + 1n,
		}),
	});

	await Ecosystem.upsert({
		id: `Savings:TotalInterestCollected`,
		create: {
			value: '',
			amount: interest,
		},
		update: ({ current }) => ({
			amount: current.amount + interest,
		}),
	});

	// map indexing
	await SavingsInterestMapping.upsert({
		id: account,
		create: {
			created: event.block.timestamp,
			blockheight: event.block.number,
			updated: event.block.timestamp,
			amount: interest,
		},
		update: (c) => ({
			updated: event.block.timestamp,
			amount: c.current.amount + interest,
		}),
	});

	const latestSaved = await SavingsSavedMapping.findUnique({
		id: account,
	});
	const latestWithdraw = await SavingsWithdrawnMapping.findUnique({
		id: account,
	});
	const latestInterest = await SavingsInterestMapping.findUnique({
		id: account,
	});

	const balance: bigint = latestSaved
		? latestSaved.amount -
		  (latestWithdraw ? latestWithdraw.amount : 0n) +
		  (latestInterest ? latestInterest.amount : 0n)
		: 0n;

	// balance indexing
	await SavingsBalance.upsert({
		id: account,
		create: {
			created: event.block.timestamp,
			blockheight: event.block.number,
			updated: event.block.timestamp,
			interest: latestInterest ? latestInterest.amount : 0n,
			balance,
		},
		update: (c) => ({
			updated: event.block.timestamp,
			interest: latestInterest ? latestInterest.amount : 0n,
			balance,
		}),
	});

	// flat indexing
	await SavingsInterest.create({
		id: `${account}-${event.block.number.toString()}-${counter.amount}`,
		data: {
			created: event.block.timestamp,
			blockheight: event.block.number,
			txHash: event.transaction.hash,
			account: account,
			amount: interest,
			rate: ratePPM,
			total: latestInterest ? latestInterest.amount : interest,
			balance,
		},
	});

	await updateTransactionLog({
		context,
		timestamp: event.block.timestamp,
		kind: 'Savings:InterestCollected',
		amount: event.args.interest,
		txHash: event.transaction.hash,
	});
});

ponder.on('Savings:Withdrawn', async ({ event, context }) => {
	const { client } = context;
	const {
		SavingsBalance,
		SavingsWithdrawn,
		SavingsSavedMapping,
		SavingsWithdrawnMapping,
		SavingsInterestMapping,
		Ecosystem,
	} = context.db;
	const { amount } = event.args;
	const account: Address = event.args.account.toLowerCase() as Address;

	const ratePPM = await client.readContract({
		abi: SavingsABI,
		address: '0x27d9AD987BdE08a0d083ef7e0e4043C857A17B38',
		functionName: 'currentRatePPM',
	});

	// ecosystem
	const counter = await Ecosystem.upsert({
		id: 'Savings:WithdrawnCounter',
		create: {
			value: '',
			amount: 1n,
		},
		update: ({ current }) => ({
			amount: current.amount + 1n,
		}),
	});

	await Ecosystem.upsert({
		id: `Savings:TotalWithdrawn`,
		create: {
			value: '',
			amount: amount,
		},
		update: ({ current }) => ({
			amount: current.amount + amount,
		}),
	});

	// map indexing
	await SavingsWithdrawnMapping.upsert({
		id: account,
		create: {
			created: event.block.timestamp,
			blockheight: event.block.number,
			updated: event.block.timestamp,
			amount,
		},
		update: (c) => ({
			updated: event.block.timestamp,
			amount: c.current.amount + amount,
		}),
	});

	const latestSaved = await SavingsSavedMapping.findUnique({
		id: account,
	});
	const latestWithdraw = await SavingsWithdrawnMapping.findUnique({
		id: account,
	});
	const latestInterest = await SavingsInterestMapping.findUnique({
		id: account,
	});

	const balance: bigint = latestSaved
		? latestSaved.amount -
		  (latestWithdraw ? latestWithdraw.amount : 0n) +
		  (latestInterest ? latestInterest.amount : 0n)
		: 0n;

	// balance indexing
	await SavingsBalance.upsert({
		id: account,
		create: {
			created: event.block.timestamp,
			blockheight: event.block.number,
			updated: event.block.timestamp,
			interest: latestInterest ? latestInterest.amount : 0n,
			balance,
		},
		update: (c) => ({
			updated: event.block.timestamp,
			interest: latestInterest ? latestInterest.amount : 0n,
			balance,
		}),
	});

	// flat indexing
	await SavingsWithdrawn.create({
		id: `${account}-${event.block.number.toString()}-${counter.amount}`,
		data: {
			created: event.block.timestamp,
			blockheight: event.block.number,
			txHash: event.transaction.hash,
			account: account,
			amount,
			rate: ratePPM,
			total: latestWithdraw ? latestWithdraw.amount : amount,
			balance,
		},
	});

	await updateTransactionLog({
		context,
		timestamp: event.block.timestamp,
		kind: 'Savings:Withdrawn',
		amount: event.args.amount,
		txHash: event.transaction.hash,
	});
});
