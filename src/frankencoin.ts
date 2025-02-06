import { ponder } from '@/generated';
import { Address, parseEther, zeroAddress } from 'viem';
import { updateTransactionLog } from './Analytic';
import { EquityABI } from '@frankencoin/zchf';
import { ADDR } from '../ponder.config';

ponder.on('Frankencoin:Profit', async ({ event, context }) => {
	const { FPS, ActiveUser, Ecosystem, ProfitLoss } = context.db;

	const fpsTotalSupply = await context.client.readContract({
		abi: EquityABI,
		address: ADDR.equity,
		functionName: 'totalSupply',
	});

	await Ecosystem.upsert({
		id: 'Equity:ProfitCounter',
		create: {
			value: '',
			amount: 1n,
		},
		update: ({ current }) => ({
			amount: current.amount + 1n,
		}),
	});

	await Ecosystem.upsert({
		id: 'Equity:Profits',
		create: {
			value: '',
			amount: event.args.amount,
		},
		update: ({ current }) => ({
			amount: current.amount + event.args.amount,
		}),
	});

	await Ecosystem.upsert({
		id: 'Equity:EarningsPerFPS',
		create: {
			value: '',
			amount: (event.args.amount * parseEther('1')) / fpsTotalSupply,
		},
		update: ({ current }) => ({
			amount: current.amount + (event.args.amount * parseEther('1')) / fpsTotalSupply,
		}),
	});

	await FPS.upsert({
		id: event.log.address,
		create: {
			profits: event.args.amount,
			loss: 0n,
			reserve: 0n,
		},
		update: ({ current }) => ({
			profits: current.profits + event.args.amount,
		}),
	});

	await ProfitLoss.upsert({
		id: `${event.args.reportingMinter}-${event.block.timestamp}-Profit`,
		create: {
			timestamp: event.block.timestamp,
			kind: 'Profit',
			amount: event.args.amount,
		},
		update: ({ current }) => ({
			amount: current.amount + event.args.amount,
		}),
	});

	await ActiveUser.upsert({
		id: event.transaction.from,
		create: {
			lastActiveTime: event.block.timestamp,
		},
		update: () => ({
			lastActiveTime: event.block.timestamp,
		}),
	});

	await updateTransactionLog({ context, timestamp: event.block.timestamp, kind: 'Equity:Profit', amount: event.args.amount });
});

ponder.on('Frankencoin:Loss', async ({ event, context }) => {
	const { FPS, ActiveUser, Ecosystem, ProfitLoss } = context.db;

	const fpsTotalSupply = await context.client.readContract({
		abi: EquityABI,
		address: ADDR.equity,
		functionName: 'totalSupply',
	});

	await Ecosystem.upsert({
		id: 'Equity:LossCounter',
		create: {
			value: '',
			amount: 1n,
		},
		update: ({ current }) => ({
			amount: current.amount + 1n,
		}),
	});

	await Ecosystem.upsert({
		id: 'Equity:Losses',
		create: {
			value: '',
			amount: event.args.amount,
		},
		update: ({ current }) => ({
			amount: current.amount + event.args.amount,
		}),
	});

	await Ecosystem.upsert({
		id: 'Equity:EarningsPerFPS',
		create: {
			value: '',
			amount: -(event.args.amount * parseEther('1')) / fpsTotalSupply,
		},
		update: ({ current }) => ({
			amount: current.amount - (event.args.amount * parseEther('1')) / fpsTotalSupply,
		}),
	});

	await FPS.upsert({
		id: event.log.address,
		create: {
			profits: 0n,
			loss: event.args.amount,
			reserve: 0n,
		},
		update: ({ current }) => ({
			loss: current.loss + event.args.amount,
		}),
	});

	await ProfitLoss.upsert({
		id: `${event.args.reportingMinter}-${event.block.timestamp}-Loss`,
		create: {
			timestamp: event.block.timestamp,
			kind: 'Loss',
			amount: event.args.amount,
		},
		update: ({ current }) => ({
			amount: current.amount + event.args.amount,
		}),
	});

	await ActiveUser.upsert({
		id: event.transaction.from,
		create: {
			lastActiveTime: event.block.timestamp,
		},
		update: () => ({
			lastActiveTime: event.block.timestamp,
		}),
	});

	await updateTransactionLog({ context, timestamp: event.block.timestamp, kind: 'Equity:Loss', amount: event.args.amount });
});

ponder.on('Frankencoin:MinterApplied', async ({ event, context }) => {
	const { Minter, ActiveUser, Ecosystem } = context.db;

	await Ecosystem.upsert({
		id: 'Frankencoin:MinterAppliedCounter',
		create: {
			value: '',
			amount: 1n,
		},
		update: ({ current }) => ({
			amount: current.amount + 1n,
		}),
	});

	await Minter.upsert({
		id: event.args.minter,
		create: {
			txHash: event.transaction.hash,
			minter: event.args.minter,
			applicationPeriod: event.args.applicationPeriod,
			applicationFee: event.args.applicationFee,
			applyMessage: event.args.message,
			applyDate: event.block.timestamp,
			suggestor: event.transaction.from,
		},
		update: ({ current }) => ({
			txHash: event.transaction.hash,
			minter: event.args.minter,
			applicationPeriod: event.args.applicationPeriod,
			applicationFee: event.args.applicationFee,
			applyMessage: event.args.message,
			applyDate: event.block.timestamp,
			suggestor: event.transaction.from,
			denyDate: undefined,
			denyMessage: undefined,
			denyTxHash: undefined,
			vetor: undefined,
		}),
	});

	await ActiveUser.upsert({
		id: event.transaction.from,
		create: {
			lastActiveTime: event.block.timestamp,
		},
		update: () => ({
			lastActiveTime: event.block.timestamp,
		}),
	});
});

ponder.on('Frankencoin:MinterDenied', async ({ event, context }) => {
	const { Minter, ActiveUser, Ecosystem } = context.db;

	await Ecosystem.upsert({
		id: 'Frankencoin:MinterDeniedCounter',
		create: {
			value: '',
			amount: 1n,
		},
		update: ({ current }) => ({
			amount: current.amount + 1n,
		}),
	});

	await Minter.update({
		id: event.args.minter,
		data: {
			denyMessage: event.args.message,
			denyDate: event.block.timestamp,
			denyTxHash: event.transaction.hash,
			vetor: event.transaction.from,
		},
	});

	await ActiveUser.upsert({
		id: event.transaction.from,
		create: {
			lastActiveTime: event.block.timestamp,
		},
		update: () => ({
			lastActiveTime: event.block.timestamp,
		}),
	});
});

ponder.on('Frankencoin:Transfer', async ({ event, context }) => {
	const { Mint, Burn, MintBurnAddressMapper, ActiveUser, Ecosystem } = context.db;

	await Ecosystem.upsert({
		id: 'Frankencoin:TransferCounter',
		create: {
			value: '',
			amount: 1n,
		},
		update: ({ current }) => ({
			amount: current.amount + 1n,
		}),
	});

	// emit Transfer(address(0), recipient, amount);
	if (event.args.from === zeroAddress) {
		await Mint.create({
			id: `${event.args.to}-mint-${event.block.number}`,
			data: {
				to: event.args.to,
				value: event.args.value,
				blockheight: event.block.number,
				timestamp: event.block.timestamp,
			},
		});

		await Ecosystem.upsert({
			id: 'Frankencoin:MintCounter',
			create: {
				value: '',
				amount: 1n,
			},
			update: ({ current }) => ({
				amount: current.amount + 1n,
			}),
		});

		await Ecosystem.upsert({
			id: 'Frankencoin:Mint',
			create: {
				value: '',
				amount: event.args.value,
			},
			update: ({ current }) => ({
				amount: current.amount + event.args.value,
			}),
		});

		await MintBurnAddressMapper.upsert({
			id: event.args.to.toLowerCase(),
			create: {
				mint: event.args.value,
				burn: 0n,
			},
			update: ({ current }) => ({
				mint: current.mint + event.args.value,
			}),
		});

		await ActiveUser.upsert({
			id: event.transaction.to as Address,
			create: {
				lastActiveTime: event.block.timestamp,
			},
			update: () => ({
				lastActiveTime: event.block.timestamp,
			}),
		});

		await updateTransactionLog({ context, timestamp: event.block.timestamp, kind: 'Frankencoin:Mint', amount: event.args.value });
	}

	// emit Transfer(account, address(0), amount);
	if (event.args.to === zeroAddress) {
		await Burn.create({
			id: `${event.args.from}-burn-${event.block.number}`,
			data: {
				from: event.args.from,
				value: event.args.value,
				blockheight: event.block.number,
				timestamp: event.block.timestamp,
			},
		});

		await Ecosystem.upsert({
			id: 'Frankencoin:BurnCounter',
			create: {
				value: '',
				amount: 1n,
			},
			update: ({ current }) => ({
				amount: current.amount + 1n,
			}),
		});

		await Ecosystem.upsert({
			id: 'Frankencoin:Burn',
			create: {
				value: '',
				amount: event.args.value,
			},
			update: ({ current }) => ({
				amount: current.amount + event.args.value,
			}),
		});

		await MintBurnAddressMapper.upsert({
			id: event.args.from.toLowerCase(),
			create: {
				mint: 0n,
				burn: event.args.value,
			},
			update: ({ current }) => ({
				burn: current.burn + event.args.value,
			}),
		});

		await ActiveUser.upsert({
			id: event.transaction.from,
			create: {
				lastActiveTime: event.block.timestamp,
			},
			update: () => ({
				lastActiveTime: event.block.timestamp,
			}),
		});

		await updateTransactionLog({ context, timestamp: event.block.timestamp, kind: 'Frankencoin:Burn', amount: event.args.value });
	}
});
