import { ponder } from 'ponder:registry';
import { CommonEcosystem, TransferReference } from 'ponder:schema';

/*
Events

TransferReference
event Transfer(address indexed from, address indexed to, uint256 amount, string ref);
event CrossTransfer(address indexed sender, address indexed from, uint64 toChain, bytes indexed to, uint256 amount, string ref);

CrossChainReference
event CrossTransfer(address indexed sender, address indexed from, uint64 toChain, bytes indexed to, uint256 amount, string ref);

CrossChainERC20
event Transfer(address indexed from, uint64 toChain, bytes indexed to, uint256 value);
*/

ponder.on('TransferReference:CrossTransfer', async ({ event, context }) => {
	const counter = await context.db
		.insert(CommonEcosystem)
		.values({
			id: 'TransferReference:Counter',
			value: '',
			amount: 1n,
		})
		.onConflictDoUpdate((current) => ({
			amount: current.amount + 1n,
		}));

	await context.db.insert(TransferReference).values({
		chainId: context.chain.id,
		count: counter.amount,
		created: event.block.timestamp,
		txHash: event.transaction.hash,
		sender: event.args.sender,
		from: event.args.from,
		to: event.args.to,
		targetChain: event.args.toChain,
		amount: event.args.amount,
		reference: event.args.ref,
	});
});

ponder.on(
	'TransferReference:Transfer(address indexed from, address indexed to, uint256 amount, string ref)',
	async ({ event, context }) => {
		const counter = await context.db
			.insert(CommonEcosystem)
			.values({
				id: 'TransferReference:Counter',
				value: '',
				amount: 1n,
			})
			.onConflictDoUpdate((current) => ({
				amount: current.amount + 1n,
			}));

		await context.db.insert(TransferReference).values({
			chainId: context.chain.id,
			count: counter.amount,
			created: event.block.timestamp,
			txHash: event.transaction.hash,
			sender: event.transaction.from,
			from: event.args.from,
			to: event.args.to,
			targetChain: 0n, // mainnet tx with ref
			amount: event.args.amount,
			reference: event.args.ref,
		});
	}
);

ponder.on(
	'TransferReference:Transfer(address indexed from, uint64 toChain, bytes indexed to, uint256 value)',
	async ({ event, context }) => {
		const counter = await context.db
			.insert(CommonEcosystem)
			.values({
				id: 'TransferReference:Counter',
				value: '',
				amount: 1n,
			})
			.onConflictDoUpdate((current) => ({
				amount: current.amount + 1n,
			}));

		await context.db.insert(TransferReference).values({
			chainId: context.chain.id,
			count: counter.amount,
			created: event.block.timestamp,
			txHash: event.transaction.hash,
			sender: event.transaction.from,
			from: event.args.from,
			to: event.args.to,
			targetChain: event.args.toChain,
			amount: event.args.value,
			reference: '', // ref is empty string
		});
	}
);
