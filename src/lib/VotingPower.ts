import { type Context } from 'ponder:registry';
import { FpsHolder } from 'ponder:schema';
import { EquityABI } from '@frankencoin/zchf';
import { Address, zeroAddress } from 'viem';
import { addr } from '../../ponder.config';
import { mainnet } from 'viem/chains';

type TransferEvent = {
	args: { from: Address; to: Address; value: bigint };
	log: { address: Address };
	block: { timestamp: bigint };
};

type TransferContext = {
	chain: { id: number };
	client: Context['client'];
	db: Context['db'];
};

export async function indexFpsHolder(event: TransferEvent, context: TransferContext) {
	if (context.chain.id !== mainnet.id) return;

	const token = event.log.address.toLowerCase() as Address;
	const equityAddr = addr[mainnet.id].equity.toLowerCase() as Address;

	if (token !== equityAddr) return;

	const from = event.args.from.toLowerCase() as Address;
	const to = event.args.to.toLowerCase() as Address;
	const value = event.args.value;
	const updated = event.block.timestamp;

	// Update sender (skip zero address for mints)
	if (from !== zeroAddress) {
		let fromVotes = 0n;
		try {
			fromVotes = await context.client.readContract({
				abi: EquityABI,
				address: addr[mainnet.id].equity,
				functionName: 'votes',
				args: [from],
			});
		} catch {}

		await context.db
			.insert(FpsHolder)
			.values({
				address: from,
				balance: 0n,
				votes: fromVotes,
				updated,
			})
			.onConflictDoUpdate((current) => ({
				balance: current.balance - value,
				votes: fromVotes,
				updated,
			}));
	}

	// Update receiver (skip zero address for burns)
	if (to !== zeroAddress) {
		let toVotes = 0n;
		try {
			toVotes = await context.client.readContract({
				abi: EquityABI,
				address: addr[mainnet.id].equity,
				functionName: 'votes',
				args: [to],
			});
		} catch {}

		await context.db
			.insert(FpsHolder)
			.values({
				address: to,
				balance: value,
				votes: toVotes,
				updated,
			})
			.onConflictDoUpdate((current) => ({
				balance: current.balance + value,
				votes: toVotes,
				updated,
			}));
	}
}
