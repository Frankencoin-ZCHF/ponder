import { ponder } from 'ponder:registry';
import { FpsHolder } from 'ponder:schema';
import { EquityABI } from '@frankencoin/zchf';
import { addr } from '../ponder.config';
import { mainnet } from 'viem/chains';
import { gt } from 'ponder';

ponder.on('VoteUpdate:block', async ({ event, context }) => {
	const holders = await context.db.sql.select().from(FpsHolder).where(gt(FpsHolder.balance, 0n));

	for (const holder of holders) {
		try {
			const votes = await context.client.readContract({
				abi: EquityABI,
				address: addr[mainnet.id].equity,
				functionName: 'votes',
				args: [holder.address],
			});

			await context.db
				.update(FpsHolder, { address: holder.address })
				.set({ votes, updated: event.block.timestamp });
		} catch {}
	}
});
