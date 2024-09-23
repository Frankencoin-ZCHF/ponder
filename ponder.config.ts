import { createConfig } from '@ponder/core';
import { Address, http } from 'viem';

import { mainnet, polygon } from 'viem/chains';
import { ADDRESS } from './ponder.address';

import { Frankencoin } from './abis/Frankencoin';
import { Equity } from './abis/Equity';
import { MintingHub as MintingHubV1 } from './abis/MintingHubV1';
import { MintingHub as MintingHubV2 } from './abis/MintingHubV2';
import { Position as PositionV1 } from './abis/PositionV1';
import { Position as PositionV2 } from './abis/PositionV2';
import { Savings } from './abis/Savings';

// mainnet (default) or polygon
const chain = (process.env.PONDER_PROFILE as string) == 'polygon' ? polygon : mainnet;
const chainId = chain.id!;
const chainAddr = ADDRESS[chain.id]!;

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
		startFrankencoin: 62171447,
		startMintingHubV1: 62171450,
		startMintingHubV2: 62171450,
		blockrange: undefined,
		maxRequestsPerSecond: 5,
		pollingInterval: 5_000,
	},
};

const config = CONFIG[chainId];

const openPositionEventV1 = MintingHubV1.find((a) => a.type === 'event' && a.name === 'PositionOpened');
if (openPositionEventV1 === undefined) throw new Error('openPositionEventV1 not found.');

const openPositionEventV2 = MintingHubV2.find((a) => a.type === 'event' && a.name === 'PositionOpened');
if (openPositionEventV2 === undefined) throw new Error('openPositionEventV2 not found.');

export default createConfig({
	networks: {
		[chain.name]: {
			chainId,
			maxRequestsPerSecond: config.maxRequestsPerSecond,
			pollingInterval: config.pollingInterval,
			transport: http(config.rpc),
		},
	},
	contracts: {
		Frankencoin: {
			// Native
			network: chain.name,
			abi: Frankencoin,
			address: chainAddr.frankenCoin as Address,
			startBlock: config.startFrankencoin,
			maxBlockRange: config.blockrange,
		},
		Equity: {
			// Native
			network: chain.name,
			abi: Equity,
			address: chainAddr.equity as Address,
			startBlock: config.startFrankencoin,
			maxBlockRange: config.blockrange,
		},
		MintingHubV1: {
			// V1
			network: chain.name,
			abi: MintingHubV1,
			address: chainAddr.mintingHubV1 as Address,
			startBlock: config.startMintingHubV1,
			maxBlockRange: config.blockrange,
		},
		PositionV1: {
			// V1
			network: chain.name,
			abi: PositionV1,
			factory: {
				address: chainAddr.mintingHubV1 as Address,
				event: openPositionEventV1,
				parameter: 'position',
			},
			startBlock: config.startMintingHubV1,
			maxBlockRange: config.blockrange,
		},
		MintingHubV2: {
			// V2
			network: chain.name,
			abi: MintingHubV2,
			address: chainAddr.mintingHubV2 as Address,
			startBlock: config.startMintingHubV2,
			maxBlockRange: config.blockrange,
		},
		PositionV2: {
			// V2
			network: chain.name,
			abi: PositionV2,
			factory: {
				address: chainAddr.mintingHubV2 as Address,
				event: openPositionEventV2,
				parameter: 'position',
			},
			startBlock: config.startMintingHubV2,
			maxBlockRange: config.blockrange,
		},
		Savings: {
			// V2
			network: chain.name,
			abi: Savings,
			address: chainAddr.savings as Address,
			startBlock: config.startMintingHubV2,
			maxBlockRange: config.blockrange,
		},
	},
});
