import { db } from 'ponder:api';
import schema from 'ponder:schema';
import { FpsHolder, VotingDelegation } from 'ponder:schema';
import { Hono } from 'hono';
import { graphql, eq, gt } from 'ponder';
import { Address } from 'viem';

const app = new Hono();
app.use('/', graphql({ db, schema }));

// --- Voting Power API ---

/**
 * Recursively find all supporters of a given address on a given chain.
 */
function findSupporters(
	address: string,
	reverseMap: Map<string, string[]>,
	visited: Set<string> = new Set()
): string[] {
	visited.add(address);
	const direct = reverseMap.get(address) || [];
	const all: string[] = [];
	for (const supporter of direct) {
		if (!visited.has(supporter)) {
			all.push(supporter);
			all.push(...findSupporters(supporter, reverseMap, visited));
		}
	}
	return all;
}

/**
 * GET /api/helpers?chainid=1&address=0x...
 *
 * Returns all supporters of a given address on a given chain,
 * including the address itself, along with each address's votes.
 */
app.get('/api/helpers', async (c) => {
	const chainId = parseInt(c.req.query('chainid') || '1');
	const address = c.req.query('address')?.toLowerCase() as Address | undefined;

	if (!address) {
		return c.json({ error: 'address parameter is required' }, 400);
	}

	// Load all delegations for this chain (only active delegations where owner != delegatedTo)
	const delegations = await db.select().from(VotingDelegation).where(eq(VotingDelegation.chainId, chainId));

	// Build reverse delegation map: delegatedTo -> [owners who delegate to it]
	const reverseMap = new Map<string, string[]>();
	for (const d of delegations) {
		const owner = (d.owner as string).toLowerCase();
		const to = (d.delegatedTo as string).toLowerCase();
		if (owner === to) continue; // skip self-delegation (means no delegation)
		if (!reverseMap.has(to)) reverseMap.set(to, []);
		reverseMap.get(to)!.push(owner);
	}

	// Find all supporters recursively
	const supporters = findSupporters(address, reverseMap);

	// Include the address itself
	const allAddresses = [address, ...supporters];

	// Load votes for each address
	const result: { address: string; votes: string }[] = [];
	for (const addr of allAddresses) {
		const rows = await db
			.select()
			.from(FpsHolder)
			.where(eq(FpsHolder.address, addr as `0x${string}`))
			.limit(1);
		const holder = rows[0];
		result.push({
			address: addr,
			votes: (holder?.votes ?? 0n).toString(),
		});
	}

	return c.json({ helpers: result });
});

/**
 * GET /api/listvoters?limit=20
 *
 * Returns all FPS holders sorted by total voting power (descending).
 * Total voting power = own votes + votes of all recursive supporters.
 */
app.get('/api/listvoters', async (c) => {
	const limit = parseInt(c.req.query('limit') || '100');
	const chainId = 1; // mainnet only for now

	// Load all FPS holders with balance > 0
	const holders = await db.select().from(FpsHolder).where(gt(FpsHolder.balance, 0n));

	// Load all delegations for mainnet
	const delegations = await db.select().from(VotingDelegation).where(eq(VotingDelegation.chainId, chainId));

	// Build reverse delegation map
	const reverseMap = new Map<string, string[]>();
	for (const d of delegations) {
		const owner = (d.owner as string).toLowerCase();
		const to = (d.delegatedTo as string).toLowerCase();
		if (owner === to) continue;
		if (!reverseMap.has(to)) reverseMap.set(to, []);
		reverseMap.get(to)!.push(owner);
	}

	// Build votes lookup from all holders (including zero balance for delegation support)
	const allHolders = await db.select().from(FpsHolder);
	const votesMap = new Map<string, bigint>();
	for (const h of allHolders) {
		votesMap.set((h.address as string).toLowerCase(), h.votes);
	}

	// Compute total votes for each holder
	const voters: { address: string; rawVotes: string; totalVotes: string }[] = [];
	for (const holder of holders) {
		const addr = (holder.address as string).toLowerCase();
		const rawVotes = holder.votes;

		// Find all supporters recursively
		const supporters = findSupporters(addr, reverseMap);

		// Sum supporter votes
		let totalVotes = rawVotes;
		for (const supporter of supporters) {
			totalVotes += votesMap.get(supporter) ?? 0n;
		}

		voters.push({
			address: addr,
			rawVotes: rawVotes.toString(),
			totalVotes: totalVotes.toString(),
		});
	}

	// Sort by total votes descending
	voters.sort((a, b) => {
		const diff = BigInt(b.totalVotes) - BigInt(a.totalVotes);
		if (diff > 0n) return 1;
		if (diff < 0n) return -1;
		return 0;
	});

	// Apply limit
	return c.json({ voters: voters.slice(0, limit) });
});

export default app;
