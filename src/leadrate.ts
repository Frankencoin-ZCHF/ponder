import { ponder } from '@/generated';
import { Address, zeroAddress } from 'viem';

ponder.on('Savings:RateProposed', async ({ event, context }) => {
	const { SavingsRateProposed } = context.db;
	const { who, nextChange, nextRate } = event.args;
	const id = `${who.toLowerCase()}-${event.block.number}`;
	await SavingsRateProposed.create({
		id,
		data: {
			created: event.block.number,
			proposer: who,
			nextRate: nextRate,
			nextChange: nextChange,
		},
	});
});

ponder.on('Savings:RateChanged', async ({ event, context }) => {
	const { SavingsRateChanged } = context.db;
	const { newRate } = event.args;
	await SavingsRateChanged.create({
		id: event.block.number.toString(),
		data: {
			created: event.block.number,
			approvedRate: newRate,
		},
	});
});
