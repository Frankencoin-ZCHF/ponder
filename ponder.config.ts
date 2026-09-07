import { createConfig, factory, mergeAbis } from 'ponder';
import { arbitrum, avalanche, base, gnosis, mainnet, optimism, polygon, sonic } from 'viem/chains';
import { createPublicClient, erc20Abi, http, zeroAddress } from 'viem';
import {
	ADDRESS,
	CCIPAdminABI,
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
	BridgeAccountingABI,
	TransferReferenceABI,
	CrossChainReferenceABI,
	FCSABI,
	MainnetVotesABI,
	BridgedVotesABI,
	MinterGovernanceABI,
} from '@frankencoin/zchf';
import { AmplifiedPositionABI, UNISWAP_AMPLIFIER_ADDRESS, UniswapAmplifierABI } from './abis/UniswapAmplifier';

export const addr = ADDRESS;

export const config = {
	// core deployment
	[mainnet.id]: {
		rpc: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_RPC_KEY}`,
		maxRequestsPerSecond: parseInt(process.env.MAX_REQUESTS_PER_SECOND || '10'),
		pollingInterval: parseInt(process.env.POLLING_INTERVAL_MS || '30000'),
		ethGetLogsBlockRange: 5000, // ~12s blocks
		startFrankencoin: 18451518,
		startMintingHubV1: 18451536,
		startMintingHubV2: 21280757,
		startTransferReference: 22678761,
		startSavingsReferal: 22536327,
		startCCIP: 22623055,
		startUniswapPoolV3: 19122801,
		startFCSGovernance: 25852506, // FCS deploy block (mainnetVotes/interestGovernance/minterGovernance/ccipGovernance share it — same tx)
		startAmplifier: 25795552, // UniswapAmplifier deploy block
	},

	// multichain support
	[polygon.id]: {
		rpc: `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_RPC_KEY}`,
		maxRequestsPerSecond: parseInt(process.env.MAX_REQUESTS_PER_SECOND || '10'),
		pollingInterval: parseInt(process.env.POLLING_INTERVAL_MS || '30000'),
		ethGetLogsBlockRange: 5000, // ~2s blocks
		startBridgedFrankencoin: 72384538,
		startSavingsReferal: 72993144,
		startFCSGovernance: 92807414, // minterGovernance/ccipGovernance/bridgedVotes deploy block (GovernanceFactory.deploy(fcsmainnet) tx)
	},
	[arbitrum.id]: {
		rpc: `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_RPC_KEY}`,
		maxRequestsPerSecond: parseInt(process.env.MAX_REQUESTS_PER_SECOND || '10'),
		// Ponder's realtime sync ingests at most 50 blocks per poll. Arbitrum produces ~4 blocks/s,
		// so with a 30s poll (1.7 blocks/s ceiling) it falls behind permanently. 4s gives 12.5 blocks/s.
		pollingInterval: Math.min(parseInt(process.env.POLLING_INTERVAL_MS || '30000'), 4000),
		ethGetLogsBlockRange: 10000, // ~250ms blocks — batch more to reduce request count
		startBridgedFrankencoin: 343470012,
		startSavingsReferal: 349273896,
		startFCSGovernance: 499275377, // minterGovernance/ccipGovernance/bridgedVotes deploy block (GovernanceFactory.deploy(fcsmainnet) tx)
	},
	[optimism.id]: {
		rpc: `https://opt-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_RPC_KEY}`,
		maxRequestsPerSecond: parseInt(process.env.MAX_REQUESTS_PER_SECOND || '10'),
		pollingInterval: parseInt(process.env.POLLING_INTERVAL_MS || '30000'),
		ethGetLogsBlockRange: 5000, // ~2s blocks
		startBridgedFrankencoin: 136678320,
		startSavingsReferal: 137404676,
		startFCSGovernance: 156162581, // minterGovernance/ccipGovernance/bridgedVotes deploy block (GovernanceFactory.deploy(fcsmainnet) tx)
		startAmplifier: 155811236, // UniswapAmplifier deploy block
	},
	[base.id]: {
		rpc: `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_RPC_KEY}`,
		maxRequestsPerSecond: parseInt(process.env.MAX_REQUESTS_PER_SECOND || '10'),
		pollingInterval: parseInt(process.env.POLLING_INTERVAL_MS || '30000'),
		ethGetLogsBlockRange: 5000, // ~2s blocks
		startBridgedFrankencoin: 31080190,
		startSavingsReferal: 31809565,
		startFCSGovernance: 50558425, // minterGovernance/ccipGovernance/bridgedVotes deploy block (GovernanceFactory.deploy(fcsmainnet) tx)
	},
	[avalanche.id]: {
		rpc: `https://avax-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_RPC_KEY}`,
		maxRequestsPerSecond: parseInt(process.env.MAX_REQUESTS_PER_SECOND || '10'),
		pollingInterval: parseInt(process.env.POLLING_INTERVAL_MS || '30000'),
		ethGetLogsBlockRange: 5000, // ~2s blocks
		startBridgedFrankencoin: 63337938,
		startSavingsReferal: 64919925,
		startFCSGovernance: 93888083, // minterGovernance/ccipGovernance/bridgedVotes deploy block (GovernanceFactory.deploy(fcsmainnet) tx)
	},
	[gnosis.id]: {
		rpc: `https://gnosis-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_RPC_KEY}`,
		maxRequestsPerSecond: parseInt(process.env.MAX_REQUESTS_PER_SECOND || '10'),
		pollingInterval: parseInt(process.env.POLLING_INTERVAL_MS || '30000'),
		ethGetLogsBlockRange: 5000, // ~5s blocks
		startBridgedFrankencoin: 40394536,
		startSavingsReferal: 40678291,
		startFCSGovernance: 47958834, // minterGovernance/ccipGovernance/bridgedVotes deploy block (GovernanceFactory.deploy(fcsmainnet) tx)
	},
	[sonic.id]: {
		rpc: `https://sonic-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_RPC_KEY}`,
		maxRequestsPerSecond: parseInt(process.env.MAX_REQUESTS_PER_SECOND || '10'),
		// Sonic produces ~1-2 blocks/s, close to the 50-blocks-per-poll ceiling at 30s. 10s gives 5 blocks/s.
		pollingInterval: Math.min(parseInt(process.env.POLLING_INTERVAL_MS || '30000'), 10000),
		ethGetLogsBlockRange: 5000, // ~500ms blocks
		startBridgedFrankencoin: 31589491,
		startSavingsReferal: 34961851,
		startFCSGovernance: 78327147, // minterGovernance/ccipGovernance/bridgedVotes deploy block (GovernanceFactory.deploy(fcsmainnet) tx)
	},
};

export const mainnetClient = createPublicClient({
	chain: mainnet,
	transport: http(config[mainnet.id].rpc),
});

const openPositionEventV1 = MintingHubV1ABI.find((a) => a.type === 'event' && a.name === 'PositionOpened');
if (openPositionEventV1 === undefined) throw new Error('openPositionEventV1 not found.');

const openPositionEventV2 = MintingHubV2ABI.find((a) => a.type === 'event' && a.name === 'PositionOpened');
if (openPositionEventV2 === undefined) throw new Error('openPositionEventV2 not found.');

const amplifiedPositionCreatedEvent = UniswapAmplifierABI.find((a) => a.type === 'event' && a.name === 'AmplifiedPositionCreated');
if (amplifiedPositionCreatedEvent === undefined) throw new Error('amplifiedPositionCreatedEvent not found.');

export default createConfig({
	chains: {
		// ### NATIVE CHAIN SUPPORT ###
		[mainnet.name]: {
			id: mainnet.id,
			maxRequestsPerSecond: config[mainnet.id].maxRequestsPerSecond,
			pollingInterval: config[mainnet.id].pollingInterval,
			ethGetLogsBlockRange: config[mainnet.id].ethGetLogsBlockRange,
			rpc: http(config[mainnet.id].rpc),
		},

		// ### MULTI CHAIN SUPPORT ###
		[polygon.name]: {
			id: polygon.id,
			maxRequestsPerSecond: config[polygon.id].maxRequestsPerSecond,
			pollingInterval: config[polygon.id].pollingInterval,
			ethGetLogsBlockRange: config[polygon.id].ethGetLogsBlockRange,
			rpc: http(config[polygon.id].rpc),
		},
		[arbitrum.name]: {
			id: arbitrum.id,
			maxRequestsPerSecond: config[arbitrum.id].maxRequestsPerSecond,
			pollingInterval: config[arbitrum.id].pollingInterval,
			ethGetLogsBlockRange: config[arbitrum.id].ethGetLogsBlockRange,
			rpc: http(config[arbitrum.id].rpc),
		},
		[optimism.name]: {
			id: optimism.id,
			maxRequestsPerSecond: config[optimism.id].maxRequestsPerSecond,
			pollingInterval: config[optimism.id].pollingInterval,
			ethGetLogsBlockRange: config[optimism.id].ethGetLogsBlockRange,
			rpc: http(config[optimism.id].rpc),
		},
		[base.name]: {
			id: base.id,
			maxRequestsPerSecond: config[base.id].maxRequestsPerSecond,
			pollingInterval: config[base.id].pollingInterval,
			ethGetLogsBlockRange: config[base.id].ethGetLogsBlockRange,
			rpc: http(config[base.id].rpc),
		},
		[avalanche.name]: {
			id: avalanche.id,
			maxRequestsPerSecond: config[avalanche.id].maxRequestsPerSecond,
			pollingInterval: config[avalanche.id].pollingInterval,
			ethGetLogsBlockRange: config[avalanche.id].ethGetLogsBlockRange,
			rpc: http(config[avalanche.id].rpc),
		},
		[gnosis.name]: {
			id: gnosis.id,
			maxRequestsPerSecond: config[gnosis.id].maxRequestsPerSecond,
			pollingInterval: config[gnosis.id].pollingInterval,
			ethGetLogsBlockRange: config[gnosis.id].ethGetLogsBlockRange,
			rpc: http(config[gnosis.id].rpc),
		},
		[sonic.name]: {
			id: sonic.id,
			maxRequestsPerSecond: config[sonic.id].maxRequestsPerSecond,
			pollingInterval: config[sonic.id].pollingInterval,
			ethGetLogsBlockRange: config[sonic.id].ethGetLogsBlockRange,
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
		FCS: {
			// mainnet-only ERC-4626 vault wrapping Equity 1:1
			chain: mainnet.name,
			abi: FCSABI,
			address: addr[mainnet.id].fcs,
			startBlock: config[mainnet.id].startFCSGovernance,
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
			address: factory({
				address: addr[mainnet.id].mintingHubV1,
				event: openPositionEventV1,
				parameter: 'position',
			}),
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
			address: factory({
				address: addr[mainnet.id].mintingHubV2,
				event: openPositionEventV2,
				parameter: 'position',
			}),
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
			// incl. SavingsV2, SavingsReferral, BridgedSavingsReferal
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
		SavingsReferral: {
			// incl. SavingsReferral, BridgedSavingsReferral
			abi: SavingsABI,
			chain: {
				[mainnet.name]: {
					address: [addr[mainnet.id].savingsReferral],
					startBlock: config[mainnet.id].startSavingsReferal,
				},
				[polygon.name]: {
					address: [addr[polygon.id].ccipBridgedSavings],
					startBlock: config[polygon.id].startSavingsReferal,
				},
				[arbitrum.name]: {
					address: [addr[arbitrum.id].ccipBridgedSavings],
					startBlock: config[arbitrum.id].startSavingsReferal,
				},
				[optimism.name]: {
					address: [addr[optimism.id].ccipBridgedSavings],
					startBlock: config[optimism.id].startSavingsReferal,
				},
				[base.name]: {
					address: [addr[base.id].ccipBridgedSavings],
					startBlock: config[base.id].startSavingsReferal,
				},
				[avalanche.name]: {
					address: [addr[avalanche.id].ccipBridgedSavings],
					startBlock: config[avalanche.id].startSavingsReferal,
				},
				[gnosis.name]: {
					address: [addr[gnosis.id].ccipBridgedSavings],
					startBlock: config[gnosis.id].startSavingsReferal,
				},
				[sonic.name]: {
					address: [addr[sonic.id].ccipBridgedSavings],
					startBlock: config[sonic.id].startSavingsReferal,
				},
			},
		},
		MinterGovernance: {
			// one instance per chain (all 8)
			abi: MinterGovernanceABI,
			chain: {
				[mainnet.name]: {
					address: addr[mainnet.id].minterGovernance,
					startBlock: config[mainnet.id].startFCSGovernance,
				},
				[polygon.name]: {
					address: addr[polygon.id].minterGovernance,
					startBlock: config[polygon.id].startFCSGovernance,
				},
				[arbitrum.name]: {
					address: addr[arbitrum.id].minterGovernance,
					startBlock: config[arbitrum.id].startFCSGovernance,
				},
				[optimism.name]: {
					address: addr[optimism.id].minterGovernance,
					startBlock: config[optimism.id].startFCSGovernance,
				},
				[base.name]: {
					address: addr[base.id].minterGovernance,
					startBlock: config[base.id].startFCSGovernance,
				},
				[avalanche.name]: {
					address: addr[avalanche.id].minterGovernance,
					startBlock: config[avalanche.id].startFCSGovernance,
				},
				[gnosis.name]: {
					address: addr[gnosis.id].minterGovernance,
					startBlock: config[gnosis.id].startFCSGovernance,
				},
				[sonic.name]: {
					address: addr[sonic.id].minterGovernance,
					startBlock: config[sonic.id].startFCSGovernance,
				},
			},
		},

		// ### AMPLIFIER (mainnet + optimism) ###
		UniswapAmplifier: {
			abi: UniswapAmplifierABI,
			chain: {
				[mainnet.name]: {
					address: UNISWAP_AMPLIFIER_ADDRESS[mainnet.id],
					startBlock: config[mainnet.id].startAmplifier,
				},
				[optimism.name]: {
					address: UNISWAP_AMPLIFIER_ADDRESS[optimism.id],
					startBlock: config[optimism.id].startAmplifier,
				},
			},
		},
		AmplifiedPosition: {
			// EIP-1167 clones, factory-discovered from UniswapAmplifier:AmplifiedPositionCreated
			abi: AmplifiedPositionABI,
			chain: {
				[mainnet.name]: {
					address: factory({
						address: UNISWAP_AMPLIFIER_ADDRESS[mainnet.id],
						event: amplifiedPositionCreatedEvent,
						parameter: 'position',
					}),
					startBlock: config[mainnet.id].startAmplifier,
				},
				[optimism.name]: {
					address: factory({
						address: UNISWAP_AMPLIFIER_ADDRESS[optimism.id],
						event: amplifiedPositionCreatedEvent,
						parameter: 'position',
					}),
					startBlock: config[optimism.id].startAmplifier,
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
					address: [addr[mainnet.id].frankencoin, addr[mainnet.id].equity, addr[mainnet.id].fcs],
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

		// ### CROSS CHAIN SUPPORT ###

		CCIPAdmin: {
			abi: CCIPAdminABI,
			chain: {
				[mainnet.name]: {
					address: addr[mainnet.id].ccipAdmin,
					startBlock: config[mainnet.id].startCCIP,
				},
				[polygon.name]: {
					address: addr[polygon.id].ccipAdmin,
					startBlock: config[polygon.id].startBridgedFrankencoin,
				},
				[arbitrum.name]: {
					address: addr[arbitrum.id].ccipAdmin,
					startBlock: config[arbitrum.id].startBridgedFrankencoin,
				},
				[optimism.name]: {
					address: addr[optimism.id].ccipAdmin,
					startBlock: config[optimism.id].startBridgedFrankencoin,
				},
				[base.name]: {
					address: addr[base.id].ccipAdmin,
					startBlock: config[base.id].startBridgedFrankencoin,
				},
				[avalanche.name]: {
					address: addr[avalanche.id].ccipAdmin,
					startBlock: config[avalanche.id].startBridgedFrankencoin,
				},
				[gnosis.name]: {
					address: addr[gnosis.id].ccipAdmin,
					startBlock: config[gnosis.id].startBridgedFrankencoin,
				},
				[sonic.name]: {
					address: addr[sonic.id].ccipAdmin,
					startBlock: config[sonic.id].startBridgedFrankencoin,
				},
			},
		},

		// Note: MainnetVotes/BridgedVotes break this section's usual "all-multichain-map" pattern —
		// MainnetVotes is single-instance mainnet-only (like Equity/FCS above), and BridgedVotes is the
		// first contract in this codebase deployed on the 7 L2s with mainnet deliberately excluded.
		MainnetVotes: {
			// mainnet-only, single instance, CCIPSender (auto-deployed by FCS's constructor)
			chain: mainnet.name,
			abi: MainnetVotesABI,
			address: addr[mainnet.id].mainnetVotes,
			startBlock: config[mainnet.id].startFCSGovernance,
		},

		BridgedVotes: {
			// one instance per L2 (7 chains — NOT mainnet), CCIPReceiver
			abi: BridgedVotesABI,
			chain: {
				[polygon.name]: {
					address: addr[polygon.id].bridgedVotes,
					startBlock: config[polygon.id].startFCSGovernance,
				},
				[arbitrum.name]: {
					address: addr[arbitrum.id].bridgedVotes,
					startBlock: config[arbitrum.id].startFCSGovernance,
				},
				[optimism.name]: {
					address: addr[optimism.id].bridgedVotes,
					startBlock: config[optimism.id].startFCSGovernance,
				},
				[base.name]: {
					address: addr[base.id].bridgedVotes,
					startBlock: config[base.id].startFCSGovernance,
				},
				[avalanche.name]: {
					address: addr[avalanche.id].bridgedVotes,
					startBlock: config[avalanche.id].startFCSGovernance,
				},
				[gnosis.name]: {
					address: addr[gnosis.id].bridgedVotes,
					startBlock: config[gnosis.id].startFCSGovernance,
				},
				[sonic.name]: {
					address: addr[sonic.id].bridgedVotes,
					startBlock: config[sonic.id].startFCSGovernance,
				},
				// no [mainnet.name] entry — BridgedVotes is not deployed on mainnet, see MainnetVotes above
			},
		},

		CCIPBridgedAccounting: {
			abi: BridgeAccountingABI,
			chain: mainnet.name,
			address: addr[mainnet.id].ccipBridgeAccounting,
			startBlock: config[mainnet.id].startCCIP,
		},

		TransferReference: {
			abi: mergeAbis([TransferReferenceABI, CrossChainReferenceABI]),
			chain: {
				[mainnet.name]: {
					address: [addr[mainnet.id].transferReference],
					startBlock: config[mainnet.id].startTransferReference,
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
	},
});
