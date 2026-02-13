import { onchainTable, primaryKey } from 'ponder';

export const PositionAggregatesV1 = onchainTable(
  'PositionAggregatesV1',
  (t) => ({
    chainId: t.integer().notNull(),
    totalMinted: t.bigint().notNull(),
    annualInterests: t.bigint().notNull(),
    updated: t.bigint().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.chainId] }),
  })
);

export const PositionAggregatesV2 = onchainTable(
  'PositionAggregatesV2',
  (t) => ({
    chainId: t.integer().notNull(),
    totalMinted: t.bigint().notNull(),
    annualInterests: t.bigint().notNull(),
    updated: t.bigint().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.chainId] }),
  })
);
