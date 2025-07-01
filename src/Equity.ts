import { ADDRESS } from '@frankencoin/zchf';
import { ponder } from 'ponder:registry';
import { CommonEcosystem, EquityDelegation, EquityTrade, EquityTradeChart } from 'ponder:schema';
import { Address, zeroAddress } from 'viem';

/*
Events

Equity:Trade
Equity:Delegation
*/

ponder.on('Equity:Trade', async ({ event, context }) => {
	const trader: Address = event.args.who;
	const amount: bigint = event.args.totPrice;
	const shares: bigint = event.args.amount;
	const price: bigint = event.args.newprice;
	const time: bigint = event.block.timestamp;

	// invested or redeemed
	if (shares > 0n) {
		// cnt
		const counter = await context.db
			.insert(CommonEcosystem)
			.values({
				id: 'Equity:InvestedCounter',
				value: '',
				amount: 1n,
			})
			.onConflictDoUpdate((current) => ({
				amount: current.amount + 1n,
			}));

		// accum.
		await context.db
			.insert(CommonEcosystem)
			.values({
				id: 'Equity:Invested',
				value: '',
				amount: amount,
			})
			.onConflictDoUpdate((current) => ({
				amount: current.amount + amount,
			}));

		// calc fee PPM for raw data
		await context.db
			.insert(CommonEcosystem)
			.values({
				id: 'Equity:InvestedFeePaidPPM',
				value: '',
				amount: amount * 3000n,
			})
			.onConflictDoUpdate((current) => ({
				amount: current.amount + amount * 3000n,
			}));

		// update trades, unique key
		await context.db.insert(EquityTrade).values({
			kind: 'Invested',
			count: counter.amount,
			trader,
			amount,
			shares,
			price,
			created: time,
			txHash: event.transaction.hash,
		});

		// await updateTransactionLog({
		// 	context,
		// 	timestamp: event.block.timestamp,
		// 	kind: 'Equity:Invested',
		// 	amount,
		// 	txHash: event.transaction.hash,
		// });
	} else {
		// cnt
		const counter = await context.db
			.insert(CommonEcosystem)
			.values({
				id: 'Equity:RedeemedCounter',
				value: '',
				amount: 1n,
			})
			.onConflictDoUpdate((current) => ({
				amount: current.amount + 1n,
			}));

		// accum.
		await context.db
			.insert(CommonEcosystem)
			.values({
				id: 'Equity:Redeemed',
				value: '',
				amount: amount,
			})
			.onConflictDoUpdate((current) => ({
				amount: current.amount + amount,
			}));

		// calc fee PPM for raw data
		await context.db
			.insert(CommonEcosystem)
			.values({
				id: 'Equity:RedeemedFeePaidPPM',
				value: '',
				amount: amount * 3000n,
			})
			.onConflictDoUpdate((current) => ({
				amount: current.amount + amount * 3000n,
			}));

		// update trades, unique key
		await context.db.insert(EquityTrade).values({
			kind: 'Redeemed',
			count: counter.amount,
			trader,
			amount,
			shares,
			price,
			created: time,
			txHash: event.transaction.hash,
		});

		// await updateTransactionLog({
		// 	context,
		// 	timestamp: event.block.timestamp,
		// 	kind: 'Equity:Redeemed',
		// 	amount,
		// 	txHash: event.transaction.hash,
		// });
	}

	await context.db
		.insert(EquityTradeChart)
		.values({
			timestamp: time,
			lastPrice: price,
		})
		.onConflictDoUpdate((current) => ({
			lastPrice: price,
		}));
});

ponder.on('Equity:Delegation', async ({ event, context }) => {
	await context.db
		.insert(EquityDelegation)
		.values({
			owner: event.args.from,
			delegatedTo: event.args.to,
		})
		.onConflictDoUpdate((current) => ({
			delegatedTo: event.args.to,
		}));
});
