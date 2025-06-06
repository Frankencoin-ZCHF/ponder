import { ponder } from '@/generated';
import { SavingsABI } from '@frankencoin/zchf';
import { ADDR } from '../ponder.config';
import { Address, parseEther } from 'viem';
import { updateTransactionLog } from './Analytic';

ponder.on('SavingsRef:RateProposed', async ({ event, context }) => {
	const { SavingsRefRateProposed, Ecosystem } = context.db;
	const { who, nextChange, nextRate } = event.args;

	const counter = await Ecosystem.upsert({
		id: 'SavingsRef:RateProposedCounter',
		create: {
			value: '',
			amount: 1n,
		},
		update: ({ current }) => ({
			amount: current.amount + 1n,
		}),
	});

	// flat indexing
	await SavingsRefRateProposed.create({
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

ponder.on('SavingsRef:RateChanged', async ({ event, context }) => {
	const { SavingsRefRateChanged, Ecosystem } = context.db;
	const { newRate } = event.args;

	const counter = await Ecosystem.upsert({
		id: 'SavingsRef:RateChangedCounter',
		create: {
			value: '',
			amount: 1n,
		},
		update: ({ current }) => ({
			amount: current.amount + 1n,
		}),
	});

	// flat indexing
	await SavingsRefRateChanged.create({
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
		kind: 'SavingsRef:RateChanged',
		amount: parseEther(newRate.toString()),
		txHash: event.transaction.hash,
	});
});

ponder.on('SavingsRef:Saved', async ({ event, context }) => {
	const { client } = context;
	const {
		SavingsRefBalance,
		SavingsRefSaved,
		SavingsRefSavedMapping,
		SavingsRefWithdrawnMapping,
		SavingsRefInterestMapping,
		Ecosystem,
	} = context.db;
	const { amount } = event.args;
	const account: Address = event.args.account.toLowerCase() as Address;

	const ratePPM = await client.readContract({
		abi: SavingsABI,
		address: ADDR.savings,
		functionName: 'currentRatePPM',
	});

	// ecosystem
	const counter = await Ecosystem.upsert({
		id: 'SavingsRef:SavedCounter',
		create: {
			value: '',
			amount: 1n,
		},
		update: ({ current }) => ({
			amount: current.amount + 1n,
		}),
	});

	await Ecosystem.upsert({
		id: `SavingsRef:TotalSaved`,
		create: {
			value: '',
			amount: amount,
		},
		update: ({ current }) => ({
			amount: current.amount + amount,
		}),
	});

	// map indexing
	await SavingsRefSavedMapping.upsert({
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

	const latestSaved = await SavingsRefSavedMapping.findUnique({
		id: account,
	});
	const latestWithdraw = await SavingsRefWithdrawnMapping.findUnique({
		id: account,
	});
	const latestInterest = await SavingsRefInterestMapping.findUnique({
		id: account,
	});

	const balance: bigint = latestSaved
		? latestSaved.amount -
		  (latestWithdraw ? latestWithdraw.amount : 0n) +
		  (latestInterest ? latestInterest.amount : 0n)
		: 0n;

	// balance indexing
	await SavingsRefBalance.upsert({
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
	await SavingsRefSaved.create({
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
		kind: 'SavingsRef:Saved',
		amount: event.args.amount,
		txHash: event.transaction.hash,
	});
});

ponder.on('SavingsRef:InterestCollected', async ({ event, context }) => {
	const { client } = context;
	const {
		SavingsRefBalance,
		SavingsRefInterest,
		SavingsRefSavedMapping,
		SavingsRefWithdrawnMapping,
		SavingsRefInterestMapping,
		Ecosystem,
	} = context.db;
	const { interest } = event.args;
	const account: Address = event.args.account.toLowerCase() as Address;

	const ratePPM = await client.readContract({
		abi: SavingsABI,
		address: ADDR.savings,
		functionName: 'currentRatePPM',
	});

	// ecosystem
	const counter = await Ecosystem.upsert({
		id: 'SavingsRef:InterestCollectedCounter',
		create: {
			value: '',
			amount: 1n,
		},
		update: ({ current }) => ({
			amount: current.amount + 1n,
		}),
	});

	await Ecosystem.upsert({
		id: `SavingsRef:TotalInterestCollected`,
		create: {
			value: '',
			amount: interest,
		},
		update: ({ current }) => ({
			amount: current.amount + interest,
		}),
	});

	// map indexing
	await SavingsRefInterestMapping.upsert({
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

	const latestSaved = await SavingsRefSavedMapping.findUnique({
		id: account,
	});
	const latestWithdraw = await SavingsRefWithdrawnMapping.findUnique({
		id: account,
	});
	const latestInterest = await SavingsRefInterestMapping.findUnique({
		id: account,
	});

	const balance: bigint = latestSaved
		? latestSaved.amount -
		  (latestWithdraw ? latestWithdraw.amount : 0n) +
		  (latestInterest ? latestInterest.amount : 0n)
		: 0n;

	// balance indexing
	await SavingsRefBalance.upsert({
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
	await SavingsRefInterest.create({
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
		kind: 'SavingsRef:InterestCollected',
		amount: event.args.interest,
		txHash: event.transaction.hash,
	});
});

ponder.on('SavingsRef:Withdrawn', async ({ event, context }) => {
	const { client } = context;
	const {
		SavingsRefBalance,
		SavingsRefWithdrawn,
		SavingsRefSavedMapping,
		SavingsRefWithdrawnMapping,
		SavingsRefInterestMapping,
		Ecosystem,
	} = context.db;
	const { amount } = event.args;
	const account: Address = event.args.account.toLowerCase() as Address;

	const ratePPM = await client.readContract({
		abi: SavingsABI,
		address: ADDR.savings,
		functionName: 'currentRatePPM',
	});

	// ecosystem
	const counter = await Ecosystem.upsert({
		id: 'SavingsRef:WithdrawnCounter',
		create: {
			value: '',
			amount: 1n,
		},
		update: ({ current }) => ({
			amount: current.amount + 1n,
		}),
	});

	await Ecosystem.upsert({
		id: `SavingsRef:TotalWithdrawn`,
		create: {
			value: '',
			amount: amount,
		},
		update: ({ current }) => ({
			amount: current.amount + amount,
		}),
	});

	// map indexing
	await SavingsRefWithdrawnMapping.upsert({
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

	const latestSaved = await SavingsRefSavedMapping.findUnique({
		id: account,
	});
	const latestWithdraw = await SavingsRefWithdrawnMapping.findUnique({
		id: account,
	});
	const latestInterest = await SavingsRefInterestMapping.findUnique({
		id: account,
	});

	const balance: bigint = latestSaved
		? latestSaved.amount -
		  (latestWithdraw ? latestWithdraw.amount : 0n) +
		  (latestInterest ? latestInterest.amount : 0n)
		: 0n;

	// balance indexing
	await SavingsRefBalance.upsert({
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
	await SavingsRefWithdrawn.create({
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
		kind: 'SavingsRef:Withdrawn',
		amount: event.args.amount,
		txHash: event.transaction.hash,
	});
});
