import { ponder } from 'ponder:registry';
import { CommonEcosystem, RollerV2Rolled } from 'ponder:schema';

ponder.on('RollerV2:Roll', async ({ event, context }) => {
	const { source, collWithdraw, repay, target, collDeposit, mint } = event.args;

	const counter = await context.db
		.insert(CommonEcosystem)
		.values({
			id: 'RollerV2:RolledCounter',
			value: '',
			amount: 1n,
		})
		.onConflictDoUpdate((current) => ({
			amount: current.amount + 1n,
		}));

	await context.db.insert(RollerV2Rolled).values({
		created: event.block.timestamp,
		count: counter.amount,
		blockheight: event.block.number,
		owner: event.transaction.from,
		source,
		collWithdraw,
		repay,
		target,
		collDeposit,
		mint,
	});
});
