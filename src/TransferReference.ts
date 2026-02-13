import { ponder, Context } from 'ponder:registry';
import { CommonEcosystem, TransferReference } from 'ponder:schema';
import { Address, Hash } from 'viem';

/*
Events

TransferReference
event Transfer(address indexed from, address indexed to, uint256 amount, string ref);
event CrossTransfer(address indexed sender, address indexed from, uint64 toChain, bytes indexed to, uint256 amount, string ref);

CrossChainReference
event Transfer(address indexed from, address indexed to, uint256 amount, string ref);
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

	const target = await getTargetAddress(context.client, event.transaction.hash);

	await context.db.insert(TransferReference).values({
		chainId: context.chain.id,
		count: counter.amount,
		created: event.block.timestamp,
		txHash: event.transaction.hash,
		sender: event.args.sender,
		from: event.args.from,
		to: target,
		toBytes: event.args.to,
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
			toBytes: '0x', // no bytes
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

		const target = await getTargetAddress(context.client, event.transaction.hash);

		await context.db.insert(TransferReference).values({
			chainId: context.chain.id,
			count: counter.amount,
			created: event.block.timestamp,
			txHash: event.transaction.hash,
			sender: event.transaction.from,
			from: event.args.from,
			to: target,
			toBytes: event.args.to,
			targetChain: event.args.toChain,
			amount: event.args.value,
			reference: '', // ref is empty string
		});
	}
);

// CCIP MessageSent event topic
const CCIP_SENT_TOPIC = '0xd0c3c799bf9e2639de44391e7f524d229b2b55f5b1ea94b2bf7da42f7243dddd';

// @dev: this will try to get the target address from the CCIP event topic instead of using the encoded bytes of keccak256(address)
async function getTargetAddress(client: Context['client'], hash: Hash): Promise<Address> {
	const tx = await client.getTransactionReceipt({ hash });
	const data = tx.logs.find((i) => i.topics.includes(CCIP_SENT_TOPIC as never));

	if (!data || !data.data) {
		throw new Error(`CCIP MessageSent event not found in transaction ${hash}`);
	}

	// Offset calculation: 2 (0x prefix) + 64*3 (3 slots of 32 bytes) + 24 (padding)
	const offset = 2 + 64 * 3 + 24;
	const addressLength = 40;

	if (data.data.length < offset + addressLength) {
		throw new Error(`Insufficient data in CCIP event for transaction ${hash}: expected at least ${offset + addressLength} chars, got ${data.data.length}`);
	}

	const extracted = data.data.slice(offset, offset + addressLength);

	// Validate extracted address format
	if (!/^[0-9a-fA-F]{40}$/.test(extracted)) {
		throw new Error(`Invalid address extracted from CCIP data in transaction ${hash}: ${extracted}`);
	}

	return `0x${extracted.toLowerCase()}` as Address;
}
