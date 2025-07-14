import { ADDRESS } from '@frankencoin/zchf';
import { ponder } from 'ponder:registry';
import { CommonEcosystem, FrankencoinProfitLoss } from 'ponder:schema';
import { Address, erc20Abi, parseEther } from 'viem';
import { mainnet } from 'viem/chains';
import { BridgedAccountingReceivedSettlement } from '../schema/BridgedAccounting';

/*
Events to correct accounting. P/L events emitted double, needs to be deducted once

CCIPBridgedAccounting:ReceivedProfits
CCIPBridgedAccounting:ReceivedLosses
CCIPBridgedAccounting:ReceivedSettlement
*/

ponder.on('CCIPBridgedAccounting:ReceivedProfits', async ({ event, context }) => {
	const minter = event.log.address.toLowerCase() as Address; // CCIPBridgedAccounting
	const fpsTotalSupply = await context.client.readContract({
		abi: erc20Abi,
		address: ADDRESS[mainnet.id].equity,
		functionName: 'totalSupply',
	});
	const perToken = (event.args.amount * parseEther('1')) / fpsTotalSupply;

	// upsert ProfitLossCounter
	const counter = await context.db
		.insert(CommonEcosystem)
		.values({
			id: 'Equity:ProfitLossCounter',
			value: '',
			amount: 1n,
		})
		.onConflictDoUpdate((current) => ({
			amount: current.amount + 1n,
		}));

	// upsert ReceivedProfitsCounter
	await context.db
		.insert(CommonEcosystem)
		.values({
			id: 'Equity:ReceivedProfitsCounter',
			value: '',
			amount: 1n,
		})
		.onConflictDoUpdate((current) => ({
			amount: current.amount + 1n,
		}));

	// upsert Profits
	const profits = await context.db.update(CommonEcosystem, { id: 'Equity:Profits' }).set((current) => ({
		amount: current.amount - event.args.amount, // deduct
	}));

	// upsert Losses
	const losses = await context.db.update(CommonEcosystem, { id: 'Equity:Losses' }).set((current) => ({
		amount: current.amount + 0n, // neutral
	}));

	// upsert EarningsPerFPS
	const earnings = await context.db.update(CommonEcosystem, { id: 'Equity:EarningsPerFPS' }).set((current) => ({
		amount: current.amount - perToken, // deduct
	}));

	// flat indexing earnings
	await context.db.insert(FrankencoinProfitLoss).values({
		chainId: context.chain.id,
		count: counter.amount,
		created: event.block.timestamp,
		kind: 'ReceivedProfits',
		amount: event.args.amount,
		minter: minter,
		profits: profits.amount,
		losses: losses.amount,
		perFPS: earnings.amount,
	});

	// update analytics
	// await updateTransactionLog({
	// 	context,
	// 	timestamp: event.block.timestamp,
	// 	kind: 'Equity:Profit',
	// 	amount: event.args.amount,
	// 	txHash: event.transaction.hash,
	// });
});

ponder.on('CCIPBridgedAccounting:ReceivedLosses', async ({ event, context }) => {
	const amount = event.args.losses;
	const minter = event.log.address.toLowerCase() as Address; // CCIPBridgedAccounting
	const fpsTotalSupply = await context.client.readContract({
		abi: erc20Abi,
		address: ADDRESS[mainnet.id].equity,
		functionName: 'totalSupply',
	});
	const perToken = -(amount * parseEther('1')) / fpsTotalSupply;

	// upsert ProfitLossCounter
	const counter = await context.db
		.insert(CommonEcosystem)
		.values({
			id: 'Equity:ProfitLossCounter',
			value: '',
			amount: 1n,
		})
		.onConflictDoUpdate((current) => ({
			amount: current.amount + 1n,
		}));

	// upsert ReceivedLossesCounter
	await context.db
		.insert(CommonEcosystem)
		.values({
			id: 'Equity:ReceivedLossesCounter',
			value: '',
			amount: 1n,
		})
		.onConflictDoUpdate((current) => ({
			amount: current.amount + 1n,
		}));

	// upsert Profits
	const profits = await context.db.update(CommonEcosystem, { id: 'Equity:Profits' }).set((current) => ({
		amount: current.amount + 0n, // neutral
	}));

	// upsert Losses
	const losses = await context.db.update(CommonEcosystem, { id: 'Equity:Losses' }).set((current) => ({
		amount: current.amount - amount, // deduct
	}));

	// upsert EarningsPerFPS
	const earnings = await context.db.update(CommonEcosystem, { id: 'Equity:EarningsPerFPS' }).set((current) => ({
		amount: current.amount - perToken, // deduct
	}));

	// flat indexing earnings
	await context.db.insert(FrankencoinProfitLoss).values({
		chainId: context.chain.id,
		count: counter.amount,
		created: event.block.timestamp,
		kind: 'ReceivedLosses',
		amount: amount,
		minter: minter,
		profits: profits.amount,
		losses: losses.amount,
		perFPS: earnings.amount,
	});

	// update analytics
	// await updateTransactionLog({
	// 	context,
	// 	timestamp: event.block.timestamp,
	// 	kind: 'Equity:Loss',
	// 	amount: event.args.amount,
	// 	txHash: event.transaction.hash,
	// });
});

ponder.on('CCIPBridgedAccounting:ReceivedSettlement', async ({ event, context }) => {
	const { chain, sender, losses, profits } = event.args;
	const created = event.block.timestamp;

	// upsert ReceivedSettlement
	const counter = await context.db
		.insert(CommonEcosystem)
		.values({
			id: 'Equity:ReceivedSettlement',
			value: '',
			amount: 1n,
		})
		.onConflictDoUpdate((current) => ({
			amount: current.amount + 1n,
		}));

	// upsert ReceivedProfits
	await context.db
		.insert(CommonEcosystem)
		.values({
			id: 'Equity:ReceivedProfits',
			value: '',
			amount: profits,
		})
		.onConflictDoUpdate((current) => ({
			amount: current.amount + profits,
		}));

	// upsert ReceivedLosses
	await context.db
		.insert(CommonEcosystem)
		.values({
			id: 'Equity:ReceivedLosses',
			value: '',
			amount: losses,
		})
		.onConflictDoUpdate((current) => ({
			amount: current.amount + losses,
		}));

	// flat indexing earnings
	await context.db.insert(BridgedAccountingReceivedSettlement).values({
		chain,
		sender,
		created,
		count: counter.amount,
		kind: 'ReceivedSettlement',
		profits,
		losses,
	});

	// update analytics
	// await updateTransactionLog({
	// 	context,
	// 	timestamp: event.block.timestamp,
	// 	kind: 'Equity:Loss',
	// 	amount: event.args.amount,
	// 	txHash: event.transaction.hash,
	// });
});
