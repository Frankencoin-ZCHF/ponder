import { ponder } from '@/generated';

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
	const { SavingsSaved, SavingsSavedMapping, Ecosystem } = context.db;
	const { account, amount } = event.args;

	// flat indexing
	await SavingsSaved.create({
		id: `${account.toLowerCase()}-${event.block.number.toString()}`,
		data: {
			created: event.block.timestamp,
			blockheight: event.block.number,
			account: account,
			amount: amount,
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
	const { SavingsInterestCollected, SavingsInterestCollectedMapping, Ecosystem } = context.db;
	const { account, interest } = event.args;

	// flat indexing
	await SavingsInterestCollected.create({
		id: `${account.toLowerCase()}-${event.block.number.toString()}`,
		data: {
			created: event.block.timestamp,
			blockheight: event.block.number,
			account,
			interest,
		},
	});

	// map indexing
	await SavingsInterestCollectedMapping.upsert({
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
	const { SavingsWithdrawn, SavingsWithdrawnMapping, Ecosystem } = context.db;
	const { account, amount } = event.args;

	// flat indexing
	await SavingsWithdrawn.create({
		id: `${account.toLowerCase()}-${event.block.number.toString()}`,
		data: {
			created: event.block.timestamp,
			blockheight: event.block.number,
			account,
			amount,
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
