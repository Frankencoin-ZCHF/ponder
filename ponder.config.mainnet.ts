import { createConfig, factory } from 'ponder';
import { arbitrum, avalanche, base, gnosis, mainnet, optimism, polygon, sonic } from 'viem/chains';
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
	// core deployment
	[chain.id]: {
		rpc: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_RPC_KEY}`,
		maxRequestsPerSecond: 5,
		pollingInterval: 5_000,
		startFrankencoin: 18451518,
		startMintingHubV1: 18451536,
		startMintingHubV2: 18451536,
	},

	// multichain support
	[polygon.id]: {
		rpc: `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_RPC_KEY}`,
		maxRequestsPerSecond: 5,
		pollingInterval: 5_000,
	},
	[arbitrum.id]: {
		rpc: `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_RPC_KEY}`,
		startFrankencoin: 18451518,
		startMintingHubV1: 18451536,
		startMintingHubV2: 18451536,
		maxRequestsPerSecond: 5,
		pollingInterval: 5_000,
	},
	[optimism.id]: {
		rpc: `https://opt-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_RPC_KEY}`,
		startFrankencoin: 18451518,
		startMintingHubV1: 18451536,
		startMintingHubV2: 18451536,
		maxRequestsPerSecond: 5,
		pollingInterval: 5_000,
	},
	[base.id]: {
		rpc: `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_RPC_KEY}`,
		startFrankencoin: 18451518,
		startMintingHubV1: 18451536,
		startMintingHubV2: 18451536,
		maxRequestsPerSecond: 5,
		pollingInterval: 5_000,
	},
	[avalanche.id]: {
		rpc: `https://avax-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_RPC_KEY}`,
		startFrankencoin: 18451518,
		startMintingHubV1: 18451536,
		startMintingHubV2: 18451536,
		maxRequestsPerSecond: 5,
		pollingInterval: 5_000,
	},
	[gnosis.id]: {
		rpc: `https://gnosis-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_RPC_KEY}`,
		startFrankencoin: 18451518,
		startMintingHubV1: 18451536,
		startMintingHubV2: 18451536,
		maxRequestsPerSecond: 5,
		pollingInterval: 5_000,
	},
	[sonic.id]: {
		rpc: `https://sonic-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_RPC_KEY}`,
		startFrankencoin: 18451518,
		startMintingHubV1: 18451536,
		startMintingHubV2: 18451536,
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
		// ### NATIVE CHAIN SUPPORT ###
		[chain.name]: {
			id: id,
			maxRequestsPerSecond: config[chain.id].maxRequestsPerSecond,
			pollingInterval: config[chain.id].pollingInterval,
			rpc: http(config[chain.id].rpc),
		},

		// ### MULTI CHAIN SUPPORT ###
		[polygon.name]: {
			id: polygon.id,
			maxRequestsPerSecond: config[polygon.id].maxRequestsPerSecond,
			pollingInterval: config[polygon.id].pollingInterval,
			rpc: http(config[polygon.id].rpc),
		},
		[arbitrum.name]: {
			id: arbitrum.id,
			maxRequestsPerSecond: config[arbitrum.id].maxRequestsPerSecond,
			pollingInterval: config[arbitrum.id].pollingInterval,
			rpc: http(config[arbitrum.id].rpc),
		},
		[optimism.name]: {
			id: optimism.id,
			maxRequestsPerSecond: config[optimism.id].maxRequestsPerSecond,
			pollingInterval: config[optimism.id].pollingInterval,
			rpc: http(config[optimism.id].rpc),
		},
		[base.name]: {
			id: base.id,
			maxRequestsPerSecond: config[base.id].maxRequestsPerSecond,
			pollingInterval: config[base.id].pollingInterval,
			rpc: http(config[base.id].rpc),
		},
		[avalanche.name]: {
			id: avalanche.id,
			maxRequestsPerSecond: config[avalanche.id].maxRequestsPerSecond,
			pollingInterval: config[avalanche.id].pollingInterval,
			rpc: http(config[avalanche.id].rpc),
		},
		[gnosis.name]: {
			id: gnosis.id,
			maxRequestsPerSecond: config[gnosis.id].maxRequestsPerSecond,
			pollingInterval: config[gnosis.id].pollingInterval,
			rpc: http(config[gnosis.id].rpc),
		},
		[sonic.name]: {
			id: sonic.id,
			maxRequestsPerSecond: config[sonic.id].maxRequestsPerSecond,
			pollingInterval: config[sonic.id].pollingInterval,
			rpc: http(config[sonic.id].rpc),
		},
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
				// bridged frankencoin in multichains
				// [polygon.name]: {
				// 	address: [addr[polygon.id]],
				// 	startBlock: config[polygon.id].startBridgedFrankencoin
				// }
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

		// ### CROSS CHAIN SUPPORT ###
		// transferReference
		// savingsReferral

		// ccipAdmin
		// ccipTokenPool
		// ccipBridgeAccounting
		// ccipGovernanceSender

		// ### MULTI CHAIN CONTRACTS ###
		// ccipAdmin
		// ccipBridgedFrankencoin
		// ccipBridgedGovernance
	},
});
