import { ponder } from 'ponder:registry';
import { CommonEcosystem, FrankencoinMinter, FrankencoinProfitLoss } from 'ponder:schema';
import { Address, erc20Abi, parseEther } from 'viem';
import { addr, chain } from '../ponder.config';

ponder.on('Frankencoin:Profit', async ({ event, context }) => {
	const minter = event.args.reportingMinter.toLowerCase() as Address;
	const fpsTotalSupply = await context.client.readContract({
		abi: erc20Abi,
		address: addr[chain.id].equity,
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

	// upsert ProfitCounter
	await context.db
		.insert(CommonEcosystem)
		.values({
			id: 'Equity:ProfitCounter',
			value: '',
			amount: 1n,
		})
		.onConflictDoUpdate((current) => ({
			amount: current.amount + 1n,
		}));

	// upsert Profits
	const profits = await context.db
		.insert(CommonEcosystem)
		.values({
			id: 'Equity:Profits',
			value: '',
			amount: event.args.amount,
		})
		.onConflictDoUpdate((current) => ({
			amount: current.amount + event.args.amount,
		}));

	// upsert Losses
	const losses = await context.db
		.insert(CommonEcosystem)
		.values({
			id: 'Equity:Losses',
			value: '',
			amount: 0n,
		})
		.onConflictDoUpdate((current) => ({
			amount: current.amount + 0n,
		}));

	// upsert EarningsPerFPS
	const earnings = await context.db
		.insert(CommonEcosystem)
		.values({
			id: 'Equity:EarningsPerFPS',
			value: '',
			amount: perToken,
		})
		.onConflictDoUpdate((current) => ({
			amount: current.amount + perToken,
		}));

	// flat indexing earnings
	await context.db.insert(FrankencoinProfitLoss).values({
		count: counter.amount,
		created: event.block.timestamp,
		kind: 'Profit',
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

ponder.on('Frankencoin:Loss', async ({ event, context }) => {
	const minter = event.args.reportingMinter.toLowerCase() as Address;
	const fpsTotalSupply = await context.client.readContract({
		abi: erc20Abi,
		address: addr[chain.id].equity,
		functionName: 'totalSupply',
	});
	const perToken = -(event.args.amount * parseEther('1')) / fpsTotalSupply;

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

	// upsert ProfitCounter
	await context.db
		.insert(CommonEcosystem)
		.values({
			id: 'Equity:LossCounter',
			value: '',
			amount: 1n,
		})
		.onConflictDoUpdate((current) => ({
			amount: current.amount + 1n,
		}));

	// upsert Profits
	const profits = await context.db
		.insert(CommonEcosystem)
		.values({
			id: 'Equity:Profits',
			value: '',
			amount: 0n,
		})
		.onConflictDoUpdate((current) => ({
			amount: current.amount + 0n,
		}));

	// upsert Losses
	const losses = await context.db
		.insert(CommonEcosystem)
		.values({
			id: 'Equity:Losses',
			value: '',
			amount: event.args.amount,
		})
		.onConflictDoUpdate((current) => ({
			amount: current.amount + event.args.amount,
		}));

	// upsert EarningsPerFPS
	const earnings = await context.db
		.insert(CommonEcosystem)
		.values({
			id: 'Equity:EarningsPerFPS',
			value: '',
			amount: perToken,
		})
		.onConflictDoUpdate((current) => ({
			amount: current.amount + perToken,
		}));

	// flat indexing earnings
	await context.db.insert(FrankencoinProfitLoss).values({
		count: counter.amount,
		created: event.block.timestamp,
		kind: 'Loss',
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
	// 	kind: 'Equity:Loss',
	// 	amount: event.args.amount,
	// 	txHash: event.transaction.hash,
	// });
});

ponder.on('Frankencoin:MinterApplied', async ({ event, context }) => {
	const minter = event.args.minter.toLowerCase() as Address;

	// upsert status
	await context.db
		.insert(CommonEcosystem)
		.values({
			id: 'Frankencoin:MinterAppliedCounter',
			value: '',
			amount: 1n,
		})
		.onConflictDoUpdate((current) => ({
			amount: current.amount + 1n,
		}));

	// upsert minter mapping
	await context.db
		.insert(FrankencoinMinter)
		.values({
			txHash: event.transaction.hash,
			minter: minter,
			applicationPeriod: event.args.applicationPeriod,
			applicationFee: event.args.applicationFee,
			applyMessage: event.args.message,
			applyDate: event.block.timestamp,
			suggestor: event.transaction.from,
		})
		.onConflictDoUpdate((current) => ({
			txHash: event.transaction.hash,
			applicationPeriod: event.args.applicationPeriod,
			applicationFee: event.args.applicationFee,
			applyMessage: event.args.message,
			applyDate: event.block.timestamp,
			suggestor: event.transaction.from,
			denyDate: undefined,
			denyMessage: undefined,
			denyTxHash: undefined,
			vetor: undefined,
		}));
});

ponder.on('Frankencoin:MinterDenied', async ({ event, context }) => {
	const minter = event.args.minter.toLowerCase() as Address;

	// upsert status
	await context.db
		.insert(CommonEcosystem)
		.values({
			id: 'Frankencoin:MinterDeniedCounter',
			value: '',
			amount: 1n,
		})
		.onConflictDoUpdate((current) => ({
			amount: current.amount + 1n,
		}));

	// upsert minter mapping
	await context.db.update(FrankencoinMinter, { minter }).set((current) => ({
		denyMessage: event.args.message,
		denyDate: event.block.timestamp,
		denyTxHash: event.transaction.hash,
		vetor: event.transaction.from,
	}));
});
