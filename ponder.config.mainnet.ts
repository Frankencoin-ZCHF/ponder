import { createConfig } from 'ponder';
import { mainnet } from 'viem/chains';
import { Address, http } from 'viem';
import {
	deployment,
	EquityABI,
	FrankencoinABI,
	MintingHubV1ABI,
	MintingHubV2ABI,
	PositionRollerABI,
	PositionV1ABI,
	PositionV2ABI,
	SavingsABI,
} from '@frankencoin/zchf';

export const chain = mainnet;
export const Id = chain.id!;
export const ADDR = deployment.ADDRESS;

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
};

export const config = CONFIG[Id];

const openPositionEventV1 = MintingHubV1ABI.find((a) => a.type === 'event' && a.name === 'PositionOpened');
if (openPositionEventV1 === undefined) throw new Error('openPositionEventV1 not found.');

const openPositionEventV2 = MintingHubV2ABI.find((a) => a.type === 'event' && a.name === 'PositionOpened');
if (openPositionEventV2 === undefined) throw new Error('openPositionEventV2 not found.');

export default createConfig({
	chains: {
		[chain.name]: {
			id: Id,
			maxRequestsPerSecond: config.maxRequestsPerSecond,
			pollingInterval: config.pollingInterval,
			rpc: http(config.rpc),
		},

		// ### MULTICHAINS ###
		// [polygon.name]: {
		// 	id: polygon.id,
		// 	maxRequestsPerSecond: config.maxRequestsPerSecond,
		// 	pollingInterval: config.pollingInterval,
		// 	rpc: http(config.rpc),
		// },
	},
	contracts: {
		Frankencoin: {
			// Core
			chain: chain.name,
			abi: FrankencoinABI,
			address: ADDR[mainnet.id].frankencoin,
			startBlock: config.startFrankencoin,
		},
		Equity: {
			// Core
			chain: chain.name,
			abi: EquityABI,
			address: ADDR[mainnet.id].equity,
			startBlock: config.startFrankencoin,
		},
		MintingHubV1: {
			// V1
			chain: chain.name,
			abi: MintingHubV1ABI,
			address: ADDR[mainnet.id].mintingHubV1,
			startBlock: config.startMintingHubV1,
		},
		PositionV1: {
			// V1
			chain: chain.name,
			abi: PositionV1ABI,
			address: {
				address: ADDR[mainnet.id].mintingHubV1,
				event: openPositionEventV1,
				parameter: 'position',
			},
			startBlock: config.startMintingHubV1,
		},
		MintingHubV2: {
			// V2
			chain: chain.name,
			abi: MintingHubV2ABI,
			address: ADDR[mainnet.id].mintingHubV2,
			startBlock: config.startMintingHubV2,
		},
		PositionV2: {
			// V2
			chain: chain.name,
			abi: PositionV2ABI,
			address: {
				address: ADDR[mainnet.id].mintingHubV2,
				event: openPositionEventV2,
				parameter: 'position',
			},
			startBlock: config.startMintingHubV2,
		},
		Savings: {
			// V2
			chain: chain.name,
			abi: SavingsABI,
			address: ADDR[mainnet.id].savings,
			startBlock: config.startMintingHubV2,
		},
		Roller: {
			// V2
			chain: chain.name,
			abi: PositionRollerABI,
			address: ADDR[mainnet.id].roller,
			startBlock: config.startMintingHubV2,
		},

		// ### MULTICHAIN CONTRACTS ###
	},
});
