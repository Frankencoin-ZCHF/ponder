import { createConfig } from '@ponder/core';
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

// mainnet (default) or polygon
const chain = (process.env.PONDER_PROFILE as string) == 'polygon' ? polygon : mainnet;
const Id = chain.id!;
const ADDR = ADDRESS[chain.id]!;

const CONFIG = {
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
		startFrankencoin: 63643990,
		startMintingHubV1: 63644014,
		startMintingHubV2: 63644131,
		blockrange: undefined,
		maxRequestsPerSecond: 5,
		pollingInterval: 5_000,
	},
};

const config = CONFIG[Id];

const openPositionEventV1 = MintingHubV1ABI.find((a) => a.type === 'event' && a.name === 'PositionOpened');
if (openPositionEventV1 === undefined) throw new Error('openPositionEventV1 not found.');

const openPositionEventV2 = MintingHubV2ABI.find((a) => a.type === 'event' && a.name === 'PositionOpened');
if (openPositionEventV2 === undefined) throw new Error('openPositionEventV2 not found.');

export default createConfig({
	networks: {
		[chain.name]: {
			chainId: Id,
			maxRequestsPerSecond: config.maxRequestsPerSecond,
			pollingInterval: config.pollingInterval,
			transport: http(config.rpc),
		},
	},
	contracts: {
		Frankencoin: {
			// Native
			network: chain.name,
			abi: FrankencoinABI,
			address: ADDR.frankenCoin as Address,
			startBlock: config.startFrankencoin,
			maxBlockRange: config.blockrange,
		},
		Equity: {
			// Native
			network: chain.name,
			abi: EquityABI,
			address: ADDR.equity as Address,
			startBlock: config.startFrankencoin,
			maxBlockRange: config.blockrange,
		},
		MintingHubV1: {
			// V1
			network: chain.name,
			abi: MintingHubV1ABI,
			address: ADDR.mintingHubV1 as Address,
			startBlock: config.startMintingHubV1,
			maxBlockRange: config.blockrange,
		},
		PositionV1: {
			// V1
			network: chain.name,
			abi: PositionV1ABI,
			factory: {
				address: ADDR.mintingHubV1 as Address,
				event: openPositionEventV1,
				parameter: 'position',
			},
			startBlock: config.startMintingHubV1,
			maxBlockRange: config.blockrange,
		},
		MintingHubV2: {
			// V2
			network: chain.name,
			abi: MintingHubV2ABI,
			address: ADDR.mintingHubV2 as Address,
			startBlock: config.startMintingHubV2,
			maxBlockRange: config.blockrange,
		},
		PositionV2: {
			// V2
			network: chain.name,
			abi: PositionV2ABI,
			factory: {
				address: ADDR.mintingHubV2 as Address,
				event: openPositionEventV2,
				parameter: 'position',
			},
			startBlock: config.startMintingHubV2,
			maxBlockRange: config.blockrange,
		},
		Savings: {
			// V2
			network: chain.name,
			abi: SavingsABI,
			address: ADDR.savings as Address,
			startBlock: config.startMintingHubV2,
			maxBlockRange: config.blockrange,
		},
		Roller: {
			// V2
			network: chain.name,
			abi: PositionRollerABI,
			address: ADDR.roller as Address,
			startBlock: config.startMintingHubV2,
			maxBlockRange: config.blockrange,
		},
	},
});
