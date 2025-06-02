import { createConfig, factory } from 'ponder';
import { polygon } from 'viem/chains';
import { erc20Abi, http } from 'viem';
import {
	testing,
	EquityABI,
	FrankencoinABI,
	MintingHubV1ABI,
	MintingHubV2ABI,
	PositionRollerABI,
	PositionV1ABI,
	PositionV2ABI,
	SavingsABI,
} from '@frankencoin/zchf';

// mainnet (default) or polygon (test) environment
export const chain = polygon;
export const id = chain.id!;
export const addr = testing.ADDRESS;
export const config = {
	[polygon.id]: {
		rpc: process.env.RPC_URL_POLYGON ?? polygon.rpcUrls.default.http[0],
		startFrankencoin: 63633900,
		startMintingHubV1: 63633900,
		startMintingHubV2: 63633900,
		blockrange: undefined,
		maxRequestsPerSecond: 10,
		pollingInterval: 5_000,
	},
};

const openPositionEventV1 = MintingHubV1ABI.find((a) => a.type === 'event' && a.name === 'PositionOpened');
if (openPositionEventV1 === undefined) throw new Error('openPositionEventV1 not found.');

const openPositionEventV2 = MintingHubV2ABI.find((a) => a.type === 'event' && a.name === 'PositionOpened');
if (openPositionEventV2 === undefined) throw new Error('openPositionEventV2 not found.');

export default createConfig({
	chains: {
		// ### NATIVE CHAIN ###
		[chain.name]: {
			id: id,
			maxRequestsPerSecond: config[chain.id].maxRequestsPerSecond,
			pollingInterval: config[chain.id].pollingInterval,
			rpc: http(config[chain.id].rpc),
		},

		// ### MULTI CHAIN ###
		// [polygon.name]: {
		// 	id: polygon.id,
		// 	maxRequestsPerSecond: config[chain.id].maxRequestsPerSecond,
		// 	pollingInterval: config[chain.id].pollingInterval,
		// 	rpc: http(config[chain.id].rpc),
		// },
	},
	contracts: {
		// ### NATIVE CONTRACT ###
		Frankencoin: {
			// Core
			chain: chain.name,
			abi: FrankencoinABI,
			address: addr[chain.id].frankencoin,
			startBlock: config[chain.id].startFrankencoin,
		},
		Equity: {
			// Core
			chain: chain.name,
			abi: EquityABI,
			address: addr[chain.id].equity,
			startBlock: config[chain.id].startFrankencoin,
		},
		MintingHubV1: {
			// V1
			chain: chain.name,
			abi: MintingHubV1ABI,
			address: addr[chain.id].mintingHubV1,
			startBlock: config[chain.id].startMintingHubV1,
		},
		PositionV1: {
			// V1
			chain: chain.name,
			abi: PositionV1ABI,
			address: {
				address: addr[chain.id].mintingHubV1,
				event: openPositionEventV1,
				parameter: 'position',
			},
			startBlock: config[chain.id].startMintingHubV1,
		},
		MintingHubV2: {
			// V2
			chain: chain.name,
			abi: MintingHubV2ABI,
			address: addr[chain.id].mintingHubV2,
			startBlock: config[chain.id].startMintingHubV2,
		},
		PositionV2: {
			// V2
			chain: chain.name,
			abi: PositionV2ABI,
			address: {
				address: addr[chain.id].mintingHubV2,
				event: openPositionEventV2,
				parameter: 'position',
			},
			startBlock: config[chain.id].startMintingHubV2,
		},
		Savings: {
			// V2
			chain: chain.name,
			abi: SavingsABI,
			address: addr[chain.id].savings,
			startBlock: config[chain.id].startMintingHubV2,
		},
		Roller: {
			// V2
			chain: chain.name,
			abi: PositionRollerABI,
			address: addr[chain.id].roller,
			startBlock: config[chain.id].startMintingHubV2,
		},

		// ### COMMON CONTRACTS ###
		ERC20: {
			abi: erc20Abi,
			chain: {
				[chain.name]: {
					address: [addr[chain.id].frankencoin, addr[chain.id].equity],
					startBlock: config[chain.id].startFrankencoin,
				},
			},
		},

		ERC20PositionV1: {
			abi: erc20Abi,
			chain: chain.name,
			address: factory({
				address: addr[chain.id].mintingHubV1,
				event: openPositionEventV1,
				parameter: 'collateral',
			}),
		},

		ERC20PositionV2: {
			abi: erc20Abi,
			chain: chain.name,
			address: factory({
				address: addr[chain.id].mintingHubV2,
				event: openPositionEventV2,
				parameter: 'collateral',
			}),
			startBlock: config[chain.id].startMintingHubV2,
		},

		// ### MULTI CHAIN CONTRACTS ###
	},
});
