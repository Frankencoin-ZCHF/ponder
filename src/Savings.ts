import { ponder } from '@/generated';
import { SavingsABI } from '@frankencoin/zchf';
import { ADDR } from '../ponder.config';

ponder.on('Savings:RateProposed', async ({ event, context }) => {
	const { SavingsRateProposed } = context.db;
	const { who, nextChange, nextRate } = event.args;

	// flat indexing
	await SavingsRateProposed.create({
		id: `${who.toLowerCase()}-${event.block.number}`,
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
	const { SavingsRateChanged } = context.db;
	const { newRate } = event.args;

	// flat indexing
	await SavingsRateChanged.create({
		id: event.block.number.toString(),
		data: {
			created: event.block.timestamp,
			blockheight: event.block.number,
			txHash: event.transaction.hash,
			approvedRate: newRate,
		},
	});
});

ponder.on('Savings:Saved', async ({ event, context }) => {
	const { client } = context;
	const { SavingsSaved, SavingsSavedMapping, Ecosystem } = context.db;
	const { account, amount } = event.args;

	const ratePPM = await client.readContract({
		abi: SavingsABI,
		address: ADDR.savings,
		functionName: 'currentRatePPM',
	});

	const latest = await SavingsSavedMapping.findUnique({
		id: account.toLowerCase(),
	});

	// flat indexing
	await SavingsSaved.create({
		id: `${account.toLowerCase()}-${event.block.number.toString()}`,
		data: {
			created: event.block.timestamp,
			blockheight: event.block.number,
			account: account,
			amount: amount,
			total: latest ? latest.amount + amount : amount,
			rate: ratePPM,
		},
	});

	// map indexing
	await SavingsSavedMapping.upsert({
		id: account.toLowerCase(),
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

	// ecosystem
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
});

ponder.on('Savings:InterestCollected', async ({ event, context }) => {
	const { client } = context;
	const { SavingsInterestClaimed, SavingsInterestClaimedMapping, Ecosystem } = context.db;
	const { account, interest } = event.args;

	const ratePPM = await client.readContract({
		abi: SavingsABI,
		address: ADDR.savings,
		functionName: 'currentRatePPM',
	});

	const latest = await SavingsInterestClaimedMapping.findUnique({
		id: account.toLowerCase(),
	});

	// flat indexing
	await SavingsInterestClaimed.create({
		id: `${account.toLowerCase()}-${event.block.number.toString()}`,
		data: {
			created: event.block.timestamp,
			blockheight: event.block.number,
			account,
			interest,
			total: latest ? latest.interest + interest : interest,
			rate: ratePPM,
		},
	});

	// map indexing
	await SavingsInterestClaimedMapping.upsert({
		id: account.toLowerCase(),
		create: {
			created: event.block.timestamp,
			blockheight: event.block.number,
			updated: event.block.timestamp,
			interest,
		},
		update: (c) => ({
			updated: event.block.timestamp,
			interest: c.current.interest + interest,
		}),
	});

	// ecosystem
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
});

ponder.on('Savings:Withdrawn', async ({ event, context }) => {
	const { client } = context;
	const { SavingsWithdrawn, SavingsWithdrawnMapping, Ecosystem } = context.db;
	const { account, amount } = event.args;

	const ratePPM = await client.readContract({
		abi: SavingsABI,
		address: ADDR.savings,
		functionName: 'currentRatePPM',
	});

	const latest = await SavingsWithdrawnMapping.findUnique({
		id: account.toLowerCase(),
	});

	// flat indexing
	await SavingsWithdrawn.create({
		id: `${account.toLowerCase()}-${event.block.number.toString()}`,
		data: {
			created: event.block.timestamp,
			blockheight: event.block.number,
			account,
			amount,
			total: latest ? latest.amount + amount : amount,
			rate: ratePPM,
		},
	});

	// map indexing
	await SavingsWithdrawnMapping.upsert({
		id: account.toLowerCase(),
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

	// ecosystem
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
});
