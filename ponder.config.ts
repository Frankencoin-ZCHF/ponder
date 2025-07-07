import { createConfig, factory } from 'ponder';
import { arbitrum, avalanche, base, gnosis, mainnet, optimism, polygon, sonic } from 'viem/chains';
import { erc20Abi, http } from 'viem';
import {
	ADDRESS,
	EquityABI,
	FrankencoinABI,
	MintingHubV1ABI,
	MintingHubV2ABI,
	PositionRollerV2ABI,
	PositionV1ABI,
	PositionV2ABI,
	UniswapV3PoolABI,
	LeadrateV2ABI,
	SavingsABI,
	SavingsV2ABI,
} from '@frankencoin/zchf';

export const addr = ADDRESS;

export const config = {
	// core deployment
	[mainnet.id]: {
		rpc: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_RPC_KEY}`,
		maxRequestsPerSecond: 5,
		pollingInterval: 5_000,
		startFrankencoin: 18451518,
		startMintingHubV1: 18451536,
		startMintingHubV2: 18451536,
		startSavingsReferal: 22536327,
		startUniswapPoolV3: 19122801,
		startchainlinkOCR2Aggregator: 19122801,
	},

	// multichain support
	[polygon.id]: {
		rpc: `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_RPC_KEY}`,
		maxRequestsPerSecond: 5,
		pollingInterval: 5_000,
		startBridgedFrankencoin: 72307201,
	},
	[arbitrum.id]: {
		rpc: `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_RPC_KEY}`,
		maxRequestsPerSecond: 5,
		pollingInterval: 5_000,
		startBridgedFrankencoin: 343470012,
	},
	[optimism.id]: {
		rpc: `https://opt-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_RPC_KEY}`,
		maxRequestsPerSecond: 5,
		pollingInterval: 5_000,
		startBridgedFrankencoin: 136678320,
	},
	[base.id]: {
		rpc: `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_RPC_KEY}`,
		maxRequestsPerSecond: 5,
		pollingInterval: 5_000,
		startBridgedFrankencoin: 31080190,
	},
	[avalanche.id]: {
		rpc: `https://avax-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_RPC_KEY}`,
		maxRequestsPerSecond: 5,
		pollingInterval: 5_000,
		startBridgedFrankencoin: 63235410,
	},
	[gnosis.id]: {
		rpc: `https://gnosis-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_RPC_KEY}`,
		maxRequestsPerSecond: 5,
		pollingInterval: 5_000,
		startBridgedFrankencoin: 40394536,
	},
	[sonic.id]: {
		rpc: `https://sonic-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_RPC_KEY}`,
		maxRequestsPerSecond: 5,
		pollingInterval: 5_000,
		startBridgedFrankencoin: 31589491,
	},
};

const openPositionEventV1 = MintingHubV1ABI.find((a) => a.type === 'event' && a.name === 'PositionOpened');
if (openPositionEventV1 === undefined) throw new Error('openPositionEventV1 not found.');

const openPositionEventV2 = MintingHubV2ABI.find((a) => a.type === 'event' && a.name === 'PositionOpened');
if (openPositionEventV2 === undefined) throw new Error('openPositionEventV2 not found.');

export default createConfig({
	chains: {
		// ### NATIVE CHAIN SUPPORT ###
		[mainnet.name]: {
			id: mainnet.id,
			maxRequestsPerSecond: config[mainnet.id].maxRequestsPerSecond,
			pollingInterval: config[mainnet.id].pollingInterval,
			rpc: http(config[mainnet.id].rpc),
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
			abi: FrankencoinABI,
			chain: {
				[mainnet.name]: {
					address: addr[mainnet.id].frankencoin,
					startBlock: config[mainnet.id].startFrankencoin,
				},
				[polygon.name]: {
					address: addr[polygon.id].ccipBridgedFrankencoin,
					startBlock: config[polygon.id].startBridgedFrankencoin,
				},
				[arbitrum.name]: {
					address: addr[arbitrum.id].ccipBridgedFrankencoin,
					startBlock: config[arbitrum.id].startBridgedFrankencoin,
				},
				[optimism.name]: {
					address: addr[optimism.id].ccipBridgedFrankencoin,
					startBlock: config[optimism.id].startBridgedFrankencoin,
				},
				[base.name]: {
					address: addr[base.id].ccipBridgedFrankencoin,
					startBlock: config[base.id].startBridgedFrankencoin,
				},
				[avalanche.name]: {
					address: addr[avalanche.id].ccipBridgedFrankencoin,
					startBlock: config[avalanche.id].startBridgedFrankencoin,
				},
				[gnosis.name]: {
					address: addr[gnosis.id].ccipBridgedFrankencoin,
					startBlock: config[gnosis.id].startBridgedFrankencoin,
				},
				[sonic.name]: {
					address: addr[sonic.id].ccipBridgedFrankencoin,
					startBlock: config[sonic.id].startBridgedFrankencoin,
				},
			},
		},
		Equity: {
			// Core
			chain: mainnet.name,
			abi: EquityABI,
			address: addr[mainnet.id].equity,
			startBlock: config[mainnet.id].startFrankencoin,
		},
		MintingHubV1: {
			// V1
			chain: mainnet.name,
			abi: MintingHubV1ABI,
			address: addr[mainnet.id].mintingHubV1,
			startBlock: config[mainnet.id].startMintingHubV1,
		},
		PositionV1: {
			// V1
			chain: mainnet.name,
			abi: PositionV1ABI,
			address: {
				address: addr[mainnet.id].mintingHubV1,
				event: openPositionEventV1,
				parameter: 'position',
			},
			startBlock: config[mainnet.id].startMintingHubV1,
		},
		MintingHubV2: {
			// V2
			chain: mainnet.name,
			abi: MintingHubV2ABI,
			address: addr[mainnet.id].mintingHubV2,
			startBlock: config[mainnet.id].startMintingHubV2,
		},
		PositionV2: {
			// V2
			chain: mainnet.name,
			abi: PositionV2ABI,
			address: {
				address: addr[mainnet.id].mintingHubV2,
				event: openPositionEventV2,
				parameter: 'position',
			},
			startBlock: config[mainnet.id].startMintingHubV2,
		},
		SavingsV2: {
			// V2
			chain: mainnet.name,
			abi: SavingsV2ABI,
			address: addr[mainnet.id].savingsV2,
			startBlock: config[mainnet.id].startMintingHubV2,
		},
		RollerV2: {
			// V2
			chain: mainnet.name,
			abi: PositionRollerV2ABI,
			address: addr[mainnet.id].rollerV2,
			startBlock: config[mainnet.id].startMintingHubV2,
		},
		Leadrate: {
			// incl. SavingsV2, SavingsReferal, BridgedSavingsReferal
			abi: LeadrateV2ABI,
			chain: {
				[mainnet.name]: {
					address: [addr[mainnet.id].savingsV2, addr[mainnet.id].savingsReferral],
					startBlock: config[mainnet.id].startMintingHubV2,
				},
				[polygon.name]: {
					address: [addr[polygon.id].ccipBridgedSavings],
					startBlock: config[polygon.id].startBridgedFrankencoin,
				},
				[arbitrum.name]: {
					address: [addr[arbitrum.id].ccipBridgedSavings],
					startBlock: config[arbitrum.id].startBridgedFrankencoin,
				},
				[optimism.name]: {
					address: [addr[optimism.id].ccipBridgedSavings],
					startBlock: config[optimism.id].startBridgedFrankencoin,
				},
				[base.name]: {
					address: [addr[base.id].ccipBridgedSavings],
					startBlock: config[base.id].startBridgedFrankencoin,
				},
				[avalanche.name]: {
					address: [addr[avalanche.id].ccipBridgedSavings],
					startBlock: config[avalanche.id].startBridgedFrankencoin,
				},
				[gnosis.name]: {
					address: [addr[gnosis.id].ccipBridgedSavings],
					startBlock: config[gnosis.id].startBridgedFrankencoin,
				},
				[sonic.name]: {
					address: [addr[sonic.id].ccipBridgedSavings],
					startBlock: config[sonic.id].startBridgedFrankencoin,
				},
			},
		},
		SavingsReferal: {
			// incl. SavingsReferal, BridgedSavingsReferal
			abi: SavingsABI,
			chain: {
				[mainnet.name]: {
					address: [addr[mainnet.id].savingsReferral],
					startBlock: config[mainnet.id].startMintingHubV2,
				},
				[polygon.name]: {
					address: [addr[polygon.id].ccipBridgedSavings],
					startBlock: config[polygon.id].startBridgedFrankencoin,
				},
				[arbitrum.name]: {
					address: [addr[arbitrum.id].ccipBridgedSavings],
					startBlock: config[arbitrum.id].startBridgedFrankencoin,
				},
				[optimism.name]: {
					address: [addr[optimism.id].ccipBridgedSavings],
					startBlock: config[optimism.id].startBridgedFrankencoin,
				},
				[base.name]: {
					address: [addr[base.id].ccipBridgedSavings],
					startBlock: config[base.id].startBridgedFrankencoin,
				},
				[avalanche.name]: {
					address: [addr[avalanche.id].ccipBridgedSavings],
					startBlock: config[avalanche.id].startBridgedFrankencoin,
				},
				[gnosis.name]: {
					address: [addr[gnosis.id].ccipBridgedSavings],
					startBlock: config[gnosis.id].startBridgedFrankencoin,
				},
				[sonic.name]: {
					address: [addr[sonic.id].ccipBridgedSavings],
					startBlock: config[sonic.id].startBridgedFrankencoin,
				},
			},
		},
		// ### COMMON CONTRACTS ###
		UniswapV3Pool: {
			chain: mainnet.name,
			abi: UniswapV3PoolABI,
			address: addr[mainnet.id].uniswapPoolV3ZCHFUSDT,
			startBlock: config[mainnet.id].startUniswapPoolV3,
		},

		ERC20: {
			abi: erc20Abi,
			chain: {
				[mainnet.name]: {
					address: [addr[mainnet.id].frankencoin, addr[mainnet.id].equity],
					startBlock: config[mainnet.id].startFrankencoin,
				},
				[polygon.name]: {
					address: [addr[polygon.id].ccipBridgedFrankencoin],
					startBlock: config[polygon.id].startBridgedFrankencoin,
				},
				[arbitrum.name]: {
					address: [addr[arbitrum.id].ccipBridgedFrankencoin],
					startBlock: config[arbitrum.id].startBridgedFrankencoin,
				},
				[optimism.name]: {
					address: [addr[optimism.id].ccipBridgedFrankencoin],
					startBlock: config[optimism.id].startBridgedFrankencoin,
				},
				[base.name]: {
					address: [addr[base.id].ccipBridgedFrankencoin],
					startBlock: config[base.id].startBridgedFrankencoin,
				},
				[avalanche.name]: {
					address: [addr[avalanche.id].ccipBridgedFrankencoin],
					startBlock: config[avalanche.id].startBridgedFrankencoin,
				},
				[gnosis.name]: {
					address: [addr[gnosis.id].ccipBridgedFrankencoin],
					startBlock: config[gnosis.id].startBridgedFrankencoin,
				},
				[sonic.name]: {
					address: [addr[sonic.id].ccipBridgedFrankencoin],
					startBlock: config[sonic.id].startBridgedFrankencoin,
				},
			},
		},

		ERC20PositionV1: {
			abi: erc20Abi,
			chain: mainnet.name,
			address: factory({
				address: addr[mainnet.id].mintingHubV1,
				event: openPositionEventV1,
				parameter: 'collateral',
			}),
			startBlock: process.env.INDEX_ERC20POSITION_V1 == 'true' ? config[mainnet.id].startMintingHubV1 : Number.MAX_SAFE_INTEGER,
		},

		ERC20PositionV2: {
			abi: erc20Abi,
			chain: mainnet.name,
			address: factory({
				address: addr[mainnet.id].mintingHubV2,
				event: openPositionEventV2,
				parameter: 'collateral',
			}),
			startBlock: process.env.INDEX_ERC20POSITION_V1 == 'true' ? config[mainnet.id].startMintingHubV2 : Number.MAX_SAFE_INTEGER,
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

		// ### Bridged Frankencoin Events
		// BridgedFrankencoin: {
		// 	abi: BridgedFrankencoinABI,
		// 	chain: {
		// 		[polygon.name]: {
		// 			address: addr[polygon.id].ccipBridgedFrankencoin,
		// 			startBlock: config[polygon.id].startBridgedFrankencoin,
		// 		},
		// 		// bridged frankencoin in multichains
		// 		// [polygon.name]: {
		// 		// 	address: [addr[polygon.id]],
		// 		// 	startBlock: config[polygon.id].startBridgedFrankencoin
		// 		// }
		// 	},
		// },
	},
});
