import { createConfig } from 'ponder';
import { mainnet, polygon } from 'viem/chains';
import { Address, http } from 'viem';
import {
	ADDRESS,
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
export const Id = chain.id!;
export const ADDR = ADDRESS[chain.id]!;

export const CONFIG = {
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
	},
	contracts: {
		Frankencoin: {
			// Core
			chain: chain.name,
			abi: FrankencoinABI,
			address: ADDR.frankenCoin as Address,
			startBlock: config.startFrankencoin,
		},
		Equity: {
			// Core
			chain: chain.name,
			abi: EquityABI,
			address: ADDR.equity as Address,
			startBlock: config.startFrankencoin,
		},
		MintingHubV1: {
			// V1
			chain: chain.name,
			abi: MintingHubV1ABI,
			address: ADDR.mintingHubV1 as Address,
			startBlock: config.startMintingHubV1,
		},
		PositionV1: {
			// V1
			chain: chain.name,
			abi: PositionV1ABI,
			address: {
				address: ADDR.mintingHubV1 as Address,
				event: openPositionEventV1,
				parameter: 'position',
			},
			startBlock: config.startMintingHubV1,
		},
		MintingHubV2: {
			// V2
			chain: chain.name,
			abi: MintingHubV2ABI,
			address: ADDR.mintingHubV2 as Address,
			startBlock: config.startMintingHubV2,
		},
		PositionV2: {
			// V2
			chain: chain.name,
			abi: PositionV2ABI,
			address: {
				address: ADDR.mintingHubV2 as Address,
				event: openPositionEventV2,
				parameter: 'position',
			},
			startBlock: config.startMintingHubV2,
		},
		Savings: {
			// V2
			chain: chain.name,
			abi: SavingsABI,
			address: ADDR.savings as Address,
			startBlock: config.startMintingHubV2,
		},
		Roller: {
			// V2
			chain: chain.name,
			abi: PositionRollerABI,
			address: ADDR.roller as Address,
			startBlock: config.startMintingHubV2,
		},
	},
});
