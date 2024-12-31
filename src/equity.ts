import { ponder } from '@/generated';
import { Address, zeroAddress } from 'viem';
import { updateTransactionLog } from './Analytic';

ponder.on('Equity:Trade', async ({ event, context }) => {
	const { Trade, VotingPower, TradeChart, ActiveUser, Ecosystem } = context.db;
	const trader: Address = event.args.who;
	const amount: bigint = event.args.totPrice;
	const shares: bigint = event.args.amount;
	const price: bigint = event.args.newprice;
	const time: bigint = event.block.timestamp;

	await Trade.create({
		id: event.args.who + '_' + time.toString(),
		data: {
			trader,
			amount,
			shares,
			price,
			time,
		},
	});

	// invested or redeemed
	if (shares > 0n) {
		// cnt
		await Ecosystem.upsert({
			id: 'Equity:InvestedCounter',
			create: {
				value: '',
				amount: 1n,
			},
			update: ({ current }) => ({
				amount: current.amount + 1n,
			}),
		});

		// accum.
		await Ecosystem.upsert({
			id: 'Equity:Invested',
			create: {
				value: '',
				amount: amount,
			},
			update: ({ current }) => ({
				amount: current.amount + amount,
			}),
		});

		// calc fee PPM for raw data
		await Ecosystem.upsert({
			id: 'Equity:InvestedFeePaidPPM',
			create: {
				value: '',
				amount: amount * 3000n,
			},
			update: ({ current }) => ({
				amount: current.amount + amount * 3000n,
			}),
		});

		await updateTransactionLog({ context, timestamp: event.block.timestamp, kind: 'Equity:Invested', amount });
	} else {
		// cnt
		await Ecosystem.upsert({
			id: 'Equity:RedeemedCounter',
			create: {
				value: '',
				amount: 1n,
			},
			update: ({ current }) => ({
				amount: current.amount + 1n,
			}),
		});

		// accum.
		await Ecosystem.upsert({
			id: 'Equity:Redeemed',
			create: {
				value: '',
				amount: amount,
			},
			update: ({ current }) => ({
				amount: current.amount + amount,
			}),
		});

		// calc fee PPM for raw data
		await Ecosystem.upsert({
			id: 'Equity:RedeemedFeePaidPPM',
			create: {
				value: '',
				amount: amount * 3000n,
			},
			update: ({ current }) => ({
				amount: current.amount + amount * 3000n,
			}),
		});

		await updateTransactionLog({ context, timestamp: event.block.timestamp, kind: 'Equity:Redeemed', amount });
	}

	await VotingPower.upsert({
		id: event.args.who,
		create: {
			address: event.args.who,
			votingPower: event.args.amount,
		},
		update: ({ current }) => ({
			votingPower: current.votingPower + event.args.amount,
		}),
	});

	await TradeChart.upsert({
		id: time.toString(),
		create: {
			time: time,
			lastPrice: event.args.newprice,
		},
		update: ({ current }) => ({
			lastPrice: event.args.newprice,
		}),
	});

	await ActiveUser.upsert({
		id: event.args.who,
		create: {
			lastActiveTime: event.block.timestamp,
		},
		update: () => ({
			lastActiveTime: event.block.timestamp,
		}),
	});
});

ponder.on('Equity:Transfer', async ({ event, context }) => {
	const { VotingPower, ActiveUser } = context.db;

	if (event.args.from == zeroAddress || event.args.to == zeroAddress) return;

	await VotingPower.update({
		id: event.args.from,
		data: ({ current }) => ({
			votingPower: current.votingPower - event.args.value,
		}),
	});

	await VotingPower.upsert({
		id: event.args.to,
		create: {
			address: event.args.to,
			votingPower: event.args.value,
		},
		update: ({ current }) => ({
			votingPower: current.votingPower + event.args.value,
		}),
	});

	await ActiveUser.upsert({
		id: event.args.from,
		create: {
			lastActiveTime: event.block.timestamp,
		},
		update: () => ({
			lastActiveTime: event.block.timestamp,
		}),
	});
	await ActiveUser.upsert({
		id: event.args.to,
		create: {
			lastActiveTime: event.block.timestamp,
		},
		update: () => ({
			lastActiveTime: event.block.timestamp,
		}),
	});
});

ponder.on('Equity:Delegation', async ({ event, context }) => {
	const { Delegation, ActiveUser } = context.db;

	await Delegation.upsert({
		id: event.args.from,
		create: {
			owner: event.args.from,
			delegatedTo: event.args.to,
		},
		update: {
			delegatedTo: event.args.to,
		},
	});

	await ActiveUser.upsert({
		id: event.args.from,
		create: {
			lastActiveTime: event.block.timestamp,
		},
		update: () => ({
			lastActiveTime: event.block.timestamp,
		}),
	});
});
