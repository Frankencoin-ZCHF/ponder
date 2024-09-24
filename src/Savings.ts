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
			approvedRate: newRate,
		},
	});
});

ponder.on('Savings:Saved', async ({ event, context }) => {
	const { SavingsSaved, SavingsSavedMapping } = context.db;
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
});

ponder.on('Savings:InterestReserved', async ({ event, context }) => {
	const { SavingsInterestReserved, SavingsInterestReservedMapping } = context.db;
	const { account, interest } = event.args;

	// flat indexing
	await SavingsInterestReserved.create({
		id: `${account}-${event.block.number.toString()}`,
		data: {
			created: event.block.timestamp,
			blockheight: event.block.number,
			account,
			interest,
		},
	});

	// map indexing
	await SavingsInterestReservedMapping.upsert({
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
});

ponder.on('Savings:Withdrawal', async ({ event, context }) => {
	const { SavingsWithdrawal, SavingsWithdrawalMapping } = context.db;
	const { account, amount } = event.args;

	// flat indexing
	await SavingsWithdrawal.create({
		id: `${account}-${event.block.number.toString()}`,
		data: {
			created: event.block.timestamp,
			blockheight: event.block.number,
			account,
			amount,
		},
	});

	// map indexing
	await SavingsWithdrawalMapping.upsert({
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
});
