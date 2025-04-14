# Frankencoin Ponder

## Deployment of service

-   Main branch should auto. deploy to: **ponder.frankencoin.com**
-   Test Deployment deploy to: **ponder.test.frankencoin.com**

## Ponder needs .env.local

check out ".env.local" file to adjust environment.
For SQLite, REMOVE THE DATABASE_URL LINE.

```
# Select Profile/Chain
PONDER_PROFILE=mainnet

# Mainnet RPC URL used for fetching blockchain data. Alchemy is recommended.
PONDER_RPC_URL_MAINNET=https://eth-mainnet.g.alchemy.com/v2/...
PONDER_RPC_URL_POLYGON=... # For testing purposes only

# (Optional) Postgres database URL. If not provided, SQLite will be used.
DATABASE_URL=
```

## Ponder config

You can adjust the default chain and chain specific parameters in "ponder.config.ts".

```
// mainnet (default) or polygon
export const chain = (process.env.PONDER_PROFILE as string) == 'polygon' ? polygon : mainnet;
export const Id = chain.id!;
export const ADDR = ADDRESS[chain.id]!;

export const CONFIG = {
	[mainnet.id]: {
		rpc: process.env.RPC_URL_MAINNET ?? mainnet.rpcUrls.default.http[0],
		startFrankencoin: 18451518,
		startMintingHubV1: 18451536,
		startMintingHubV2: 18451536,
		blockrange: undefined,
		maxRequestsPerSecond: 5,
		pollingInterval: 5_000,
	},
	[polygon.id]: {
		rpc: process.env.RPC_URL_POLYGON ?? polygon.rpcUrls.default.http[0],
		startFrankencoin: 63633900,
		startMintingHubV1: 63633900,
		startMintingHubV2: 63633900,
		blockrange: undefined,
		maxRequestsPerSecond: 5,
		pollingInterval: 5_000,
	},
};

	...
}
```

## Add / Adjust custom chain(s)

Edit and add your custom chain: "ponder.chains.ts"

Example:

```
export const ethereum3 = {
	id: 1337,
	name: 'Ethereum3',
	nativeCurrency: { name: 'Ethereum3', symbol: 'ETH3', decimals: 18 },
	rpcUrls: {
		default: { http: ['https://ethereum3.domain.com'] },
	},
	blockExplorers: {
		default: { name: 'Blockscout', url: 'https://blockscout3.domain.com' },
	},
} as const satisfies Chain;
```
