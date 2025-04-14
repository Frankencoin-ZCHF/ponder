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
	ReferenceTransferABI,
} from '@frankencoin/zchf';

// mainnet (default) or polygon (test) environment
export const chain = (process.env.PONDER_PROFILE as string) == 'polygon' ? polygon : mainnet;
export const Id = chain.id!;
export const ADDR = ADDRESS[chain.id]!;

export const CONFIG = {
	[mainnet.id]: {
		rpc: process.env.RPC_URL_MAINNET ?? mainnet.rpcUrls.default.http[0],
		startFrankencoin: 18451518,
		startMintingHubV1: 18451536,
		startMintingHubV2: 18451536,
		startReferenceTransfer: 22438054,
		startSavingsDetached: 22536327, // FIXME: update block height
		blockrange: undefined,
		maxRequestsPerSecond: 5,
		pollingInterval: 5_000,
	},
	[polygon.id]: {
		rpc: process.env.RPC_URL_POLYGON ?? polygon.rpcUrls.default.http[0],
		startFrankencoin: 63633900,
		startMintingHubV1: 63633900,
		startMintingHubV2: 63633900,
		startReferenceTransfer: 71252586,
		startSavingsDetached: 71253238,
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
			// Core
			network: chain.name,
			abi: FrankencoinABI,
			address: ADDR.frankenCoin as Address,
			startBlock: config.startFrankencoin,
		},
		Equity: {
			// Core
			network: chain.name,
			abi: EquityABI,
			address: ADDR.equity as Address,
			startBlock: config.startFrankencoin,
		},
		MintingHubV1: {
			// V1
			network: chain.name,
			abi: MintingHubV1ABI,
			address: ADDR.mintingHubV1 as Address,
			startBlock: config.startMintingHubV1,
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
		},
		MintingHubV2: {
			// V2
			network: chain.name,
			abi: MintingHubV2ABI,
			address: ADDR.mintingHubV2 as Address,
			startBlock: config.startMintingHubV2,
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
		},
		Savings: {
			// V2
			network: chain.name,
			abi: SavingsABI,
			// hardcoded for now to avoid conflicts with NPM version and multichain
			address: '0x27d9AD987BdE08a0d083ef7e0e4043C857A17B38',
			startBlock: config.startSavingsDetached,
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
		ReferenceTransfer: {
			network: chain.name,
			abi: ReferenceTransferABI,
			address: ADDR.referenceTransfer as Address,
			startBlock: config.startReferenceTransfer,
			maxBlockRange: config.blockrange,
		},
		// SavingsDetached: {
		// 	network: chain.name,
		// 	abi: SavingsABI,
		// 	address: ADDR.savingsDetached as Address,
		// 	startBlock: config.startSavingsDetached,
		// 	maxBlockRange: config.blockrange,
		// },
	},
});
