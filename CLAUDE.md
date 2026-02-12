# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a Ponder-based blockchain indexer for Frankencoin (ZCHF), a decentralized stablecoin system. It indexes events from Ethereum mainnet and multiple L2 chains (Polygon, Arbitrum, Optimism, Base, Avalanche, Gnosis, Sonic) and exposes data via a GraphQL API.

## Environment Setup

Create `.env.local` from `.env.example`:
- `PORT`: Server port (default: 42069)
- `ALCHEMY_RPC_KEY`: Required Alchemy API key for RPC access
- `DATABASE_URL`: Optional Postgres URL (uses SQLite if omitted)
- `MAX_REQUESTS_PER_SECOND`: Rate limiting for RPC calls (default: 10)
- `INDEX_ERC20POSITION_V1` / `INDEX_ERC20POSITION_V2`: Feature flags for ERC20 position indexing (default: false)

## Commands

```bash
# Development with live reloading (auto-installs deps, disables UI)
yarn dev

# Production start
yarn start

# Generate Ponder types from schema and config
yarn codegen

# Lint code
yarn lint

# Type check
yarn typecheck
```

## Architecture

### Multichain Configuration

The indexer supports a native chain (Ethereum mainnet) and multiple bridged chains. Configuration is centralized in `ponder.config.ts`:

- **Native contracts** (mainnet only): Frankencoin core, Equity, MintingHub V1/V2, Position V1/V2, Savings, RollerV2
- **Bridged contracts** (all chains): CCIP bridged Frankencoin, bridged Savings, Transfer Reference
- **Chain configs** exported via `config` object with RPC URLs, rate limits, and start blocks per chain

Contract addresses and ABIs are imported from `@frankencoin/zchf` package via `ADDRESS` and various ABI exports.

### Schema and Event Handlers

**Schema definition** (`schema/` directory):
- Schema files define database tables using Ponder's `onchainTable` helper
- Each file exports tables for a specific contract domain (e.g., `Frankencoin.ts`, `MintingHubV1.ts`)
- All schemas are re-exported through `ponder.schema.ts`
- Tables use composite primary keys with `chainId` to support multichain data

**Event handlers** (`src/` directory):
- Event handler files mirror schema files by name (e.g., `src/Frankencoin.ts` handles events for schemas in `schema/Frankencoin.ts`)
- Handlers use `ponder.on('<Contract>:<EventName>', ...)` pattern
- Access database via `context.db` for inserts/updates
- Use `context.client` for on-chain reads (tied to event source chain)

**Important**: `context.client` cannot switch chains dynamically. For cross-chain reads, create a separate `createPublicClient` from viem (see comment in `src/Frankencoin.ts:19`).

### Helper Libraries

- `src/lib/TransactionLog.ts`: `updateTransactionLog()` - standardized transaction logging
- `src/lib/ERC20Balance.ts`: ERC20 balance tracking utilities
- `src/lib/ERC20MintBurn.ts`: Mint/burn event handling

### Dynamic Contract Addresses

The config uses Ponder's `factory()` helper for dynamically deployed contracts:
- Position contracts (V1/V2) are discovered from `PositionOpened` events on MintingHub contracts
- ERC20 collateral tokens are discovered from position collateral parameters

### API

The API (`src/api/index.ts`) uses Hono to serve a GraphQL endpoint with auto-generated schema from Ponder tables.

## Deployment

- **Main branch**: Auto-deploys to ponder.frankencoin.com
- **Test deployment**: ponder.test.frankencoin.com

## Key Patterns

- Always include `chainId` in composite primary keys for multichain support
- Use `onConflictDoUpdate()` for upsert operations with calculated updates
- Contract addresses should be normalized to lowercase with `toLowerCase() as Address`
- Start blocks are critical for sync performance - stored in `ponder.config.ts` per chain
- Schema changes require regenerating types with `yarn codegen`
