import { createConfig, factory } from 'ponder';
import { mainnet } from 'viem/chains';
import { erc20Abi, http } from 'viem';
import {
	deployment,
	EquityABI,
	FrankencoinABI,
	MintingHubV1ABI,
	MintingHubV2ABI,
	PositionRollerV2ABI,
	PositionV1ABI,
	PositionV2ABI,
	SavingsV2ABI,
} from '@frankencoin/zchf';

export const chain = mainnet;
export const id = chain.id!;
export const addr = deployment.ADDRESS;
export const config = {
	[chain.id]: {
		rpc: process.env.RPC_URL_MAINNET ?? mainnet.rpcUrls.default.http[0],
		startFrankencoin: 18451518,
		startMintingHubV1: 18451536,
		startMintingHubV2: 18451536,
		blockrange: undefined,
		maxRequestsPerSecond: 5,
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
		SavingsV2: {
			// V2
			chain: chain.name,
			abi: SavingsV2ABI,
			address: addr[chain.id].savings,
			startBlock: config[chain.id].startMintingHubV2,
		},
		RollerV2: {
			// V2
			chain: chain.name,
			abi: PositionRollerV2ABI,
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
			startBlock: config[chain.id].startMintingHubV1,
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
