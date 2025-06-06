import { ponder } from '@/generated';

ponder.on('Roller:Roll', async ({ event, context }) => {
	const { RollerRolled, Ecosystem } = context.db;
	const { source, collWithdraw, repay, target, collDeposit, mint } = event.args;

	const counter = await Ecosystem.upsert({
		id: 'Roller:RolledCounter',
		create: {
			value: '',
			amount: 1n,
		},
		update: ({ current }) => ({
			amount: current.amount + 1n,
		}),
	});

	// flat indexing
	await RollerRolled.create({
		id: `${source.toLowerCase()}-${target.toLowerCase()}-${event.block.number}-${counter.amount}`,
		data: {
			created: event.block.timestamp,
			blockheight: event.block.number,
			owner: event.transaction.from,
			source,
			collWithdraw,
			repay,
			target,
			collDeposit,
			mint,
		},
	});
});
