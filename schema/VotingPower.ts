import { index, onchainTable, primaryKey } from 'ponder';

// Table: FPS Holders with balance and votes (mainnet only for now)
export const FpsHolder = onchainTable(
	'FpsHolder',
	(t) => ({
		address: t.hex().notNull(),
		balance: t.bigint().notNull(),
		votes: t.bigint().notNull(),
		updated: t.bigint().notNull(),
	}),
	(table) => ({
		pk: primaryKey({
			columns: [table.address],
		}),
	})
);

// Table: Voting Delegations (multi-chain capable, keyed by chainId + owner)
export const VotingDelegation = onchainTable(
	'VotingDelegation',
	(t) => ({
		chainId: t.integer().notNull(),
		owner: t.hex().notNull(),
		delegatedTo: t.hex().notNull(),
	}),
	(table) => ({
		pk: primaryKey({
			columns: [table.chainId, table.owner],
		}),
		delegatedToIdx: index().on(table.chainId, table.delegatedTo),
	})
);
