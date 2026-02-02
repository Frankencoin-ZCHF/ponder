import { ERC20ABI } from '@frankencoin/zchf';
import { ponder } from 'ponder:registry';
import {
	CommonEcosystem,
	MintingHubV2ChallengeBidV2,
	MintingHubV2ChallengeV2,
	MintingHubV2PositionV2,
	MintingHubV2Status,
} from 'ponder:schema';
import { Address } from 'viem';

/*
Events

MintingHubV2:PositionOpened
MintingHubV2:ChallengeStarted
MintingHubV2:ChallengeAverted
MintingHubV2:ChallengeSucceeded
*/

// event PositionOpened(address indexed owner, address indexed position, address original, address collateral);
ponder.on('MintingHubV2:PositionOpened', async ({ event, context }) => {
	const { client } = context;
	const { PositionV2 } = context.contracts;

	// ------------------------------------------------------------------
	// FROM EVENT & TRANSACTION
	const { owner, position, collateral } = event.args;
	const parent = event.args.original;

	const created: bigint = event.block.timestamp;

	const isOriginal: boolean = parent.toLowerCase() === position.toLowerCase();
	const isClone: boolean = !isOriginal;
	const closed: boolean = false;
	const denied: boolean = false;

	// ------------------------------------------------------------------
	// CONST
	const original = await client.readContract({
		abi: PositionV2.abi,
		address: position,
		functionName: 'original',
	});

	const zchf = await client.readContract({
		abi: PositionV2.abi,

		address: position,
		functionName: 'zchf',
	});

	const minimumCollateral = await client.readContract({
		abi: PositionV2.abi,

		address: position,
		functionName: 'minimumCollateral',
	});

	const riskPremiumPPM = await client.readContract({
		abi: PositionV2.abi,

		address: position,
		functionName: 'riskPremiumPPM',
	});

	const reserveContribution = await client.readContract({
		abi: PositionV2.abi,

		address: position,
		functionName: 'reserveContribution',
	});

	const start = await client.readContract({
		abi: PositionV2.abi,

		address: position,
		functionName: 'start',
	});

	const expiration = await client.readContract({
		abi: PositionV2.abi,

		address: position,
		functionName: 'expiration',
	});

	const challengePeriod = await client.readContract({
		abi: PositionV2.abi,

		address: position,
		functionName: 'challengePeriod',
	});

	const limitForClones = await client.readContract({
		abi: PositionV2.abi,

		address: position,
		functionName: 'limit',
	});

	// ------------------------------------------------------------------
	// ZCHF ERC20
	const zchfName = await client.readContract({
		abi: ERC20ABI,
		address: zchf,
		functionName: 'name',
	});

	const zchfSymbol = await client.readContract({
		abi: ERC20ABI,
		address: zchf,
		functionName: 'symbol',
	});

	const zchfDecimals = await client.readContract({
		abi: ERC20ABI,
		address: zchf,
		functionName: 'decimals',
	});

	// ------------------------------------------------------------------
	// COLLATERAL ERC20
	const collateralName = await client.readContract({
		abi: ERC20ABI,
		address: collateral,
		functionName: 'name',
	});

	const collateralSymbol = await client.readContract({
		abi: ERC20ABI,
		address: collateral,
		functionName: 'symbol',
	});

	const collateralDecimals = await client.readContract({
		abi: ERC20ABI,
		address: collateral,
		functionName: 'decimals',
	});

	const collateralBalance = await client.readContract({
		abi: ERC20ABI,
		address: collateral,
		functionName: 'balanceOf',
		args: [position],
	});

	// ------------------------------------------------------------------
	// CHANGEABLE
	const price = await client.readContract({
		abi: PositionV2.abi,
		address: position,
		functionName: 'price',
	});

	const availableForClones = await client.readContract({
		abi: PositionV2.abi,
		address: position,
		functionName: 'availableForClones',
	});

	const availableForMinting = await client.readContract({
		abi: PositionV2.abi,
		address: position,
		functionName: 'availableForMinting',
	});

	const minted = await client.readContract({
		abi: PositionV2.abi,
		address: position,
		functionName: 'minted',
	});

	const cooldown = await client.readContract({
		abi: PositionV2.abi,
		address: event.args.position,
		functionName: 'cooldown',
	});

	// ------------------------------------------------------------------
	// CALC VALUES
	// const priceAdjusted = price / BigInt(10 ** (36 - collateralDecimals));
	const limitForPosition = (collateralBalance * price) / BigInt(10 ** zchfDecimals);
	const availableForPosition = limitForPosition - minted;

	// ------------------------------------------------------------------
	// ------------------------------------------------------------------
	// ------------------------------------------------------------------
	// If clone, update original position
	if (isClone) {
		const originalAvailableForClones = await client.readContract({
			abi: PositionV2.abi,
			address: original,
			functionName: 'availableForClones',
		});

		const originalAvailableForMinting = await client.readContract({
			abi: PositionV2.abi,
			address: original,
			functionName: 'availableForMinting',
		});

		await context.db.update(MintingHubV2PositionV2, { position: original.toLowerCase() as Address }).set({
			availableForClones: originalAvailableForClones,
			availableForMinting: originalAvailableForMinting,
		});
	}

	// ------------------------------------------------------------------
	// ------------------------------------------------------------------
	// ------------------------------------------------------------------
	// Create position entry for DB
	await context.db.insert(MintingHubV2PositionV2).values({
		position: position.toLowerCase() as Address,
		owner,
		zchf,
		collateral,
		price,

		created,
		isOriginal,
		isClone,
		denied,
		closed,
		original,
		parent,

		minimumCollateral,
		riskPremiumPPM,
		reserveContribution,
		start,
		cooldown: BigInt(cooldown),
		expiration,
		challengePeriod,

		zchfName,
		zchfSymbol,
		zchfDecimals,

		collateralName,
		collateralSymbol,
		collateralDecimals,
		collateralBalance,

		limitForClones,
		availableForClones,
		availableForMinting,
		minted,
	});

	// ------------------------------------------------------------------
	// COMMON

	await context.db
		.insert(CommonEcosystem)
		.values({
			id: 'MintingHubV2:TotalPositions',
			value: '',
			amount: 1n,
		})
		.onConflictDoUpdate((current) => ({
			amount: current.amount + 1n,
		}));

	await context.db
		.insert(MintingHubV2Status)
		.values({
			position: event.args.position.toLowerCase() as Address,
			ownerTransfersCounter: 0n,
			mintingUpdatesCounter: 0n,
			challengeStartedCounter: 0n,
			challengeAvertedBidsCounter: 0n,
			challengeSucceededBidsCounter: 0n,
		})
		.onConflictDoNothing();
});

ponder.on('MintingHubV2:ChallengeStarted', async ({ event, context }) => {
	const { client } = context;
	const { MintingHubV2, PositionV2 } = context.contracts;

	const challenges = await client.readContract({
		abi: MintingHubV2.abi,
		address: MintingHubV2.address,
		functionName: 'challenges',
		args: [event.args.number],
	});

	const period = await client.readContract({
		abi: PositionV2.abi,
		address: event.args.position,
		functionName: 'challengePeriod',
	});

	const liqPrice = await client.readContract({
		abi: PositionV2.abi,
		address: event.args.position,
		functionName: 'price',
	});

	await context.db.insert(MintingHubV2ChallengeV2).values({
		position: event.args.position.toLowerCase() as Address,
		number: event.args.number,
		txHash: event.transaction.hash,

		challenger: event.args.challenger,
		start: BigInt(challenges[1]),
		created: event.block.timestamp,
		duration: BigInt(period),
		size: event.args.size,
		liqPrice,

		bids: 0n,
		filledSize: 0n,
		acquiredCollateral: 0n,
		status: 'Active',
	});

	// ------------------------------------------------------------------
	// COMMON
	await context.db
		.insert(CommonEcosystem)
		.values({
			id: 'MintingHubV2:TotalChallenges',
			value: '',
			amount: 1n,
		})
		.onConflictDoUpdate((current) => ({
			amount: current.amount + 1n,
		}));

	await context.db
		.insert(MintingHubV2Status)
		.values({
			position: event.args.position.toLowerCase() as Address,
			ownerTransfersCounter: 0n,
			mintingUpdatesCounter: 0n,
			challengeStartedCounter: 1n,
			challengeAvertedBidsCounter: 0n,
			challengeSucceededBidsCounter: 0n,
		})
		.onConflictDoUpdate((current) => ({
			challengeStartedCounter: current.challengeStartedCounter + 1n,
		}));
});

// event ChallengeAverted(address indexed position, uint256 number, uint256 size);
ponder.on('MintingHubV2:ChallengeAverted', async ({ event, context }) => {
	const { client } = context;
	const { MintingHubV2, PositionV2 } = context.contracts;

	const challenges = await client.readContract({
		abi: MintingHubV2.abi,
		address: MintingHubV2.address,
		functionName: 'challenges',
		args: [event.args.number],
	});

	const cooldown = await client.readContract({
		abi: PositionV2.abi,
		address: event.args.position,
		functionName: 'cooldown',
	});

	const liqPrice = await client.readContract({
		abi: PositionV2.abi,
		address: event.args.position,
		functionName: 'price',
	});

	const challenge = await context.db.find(MintingHubV2ChallengeV2, {
		position: event.args.position.toLowerCase() as Address,
		number: event.args.number,
	});

	if (!challenge) throw new Error('ChallengeV2 not found');

	const _price: number = parseInt(liqPrice.toString());
	const _size: number = parseInt(event.args.size.toString());
	const _amount: number = (_price / 1e18) * _size;

	// create ChallengeBidV2 entry
	await context.db.insert(MintingHubV2ChallengeBidV2).values({
		position: event.args.position.toLowerCase() as Address,
		number: event.args.number,
		numberBid: challenge.bids,
		txHash: event.transaction.hash,
		bidder: event.transaction.from,
		created: event.block.timestamp,
		bidType: 'Averted',
		bid: BigInt(_amount),
		price: liqPrice,
		filledSize: event.args.size,
		acquiredCollateral: 0n,
		challengeSize: challenge.size,
	});

	// update ChallengeV2 related changes
	await context.db
		.update(MintingHubV2ChallengeV2, { position: event.args.position.toLowerCase() as Address, number: event.args.number })
		.set((current) => ({
			bids: current.bids + 1n,
			filledSize: current.filledSize + event.args.size,
			status: challenges[3] === 0n ? 'Success' : current.status,
		}));

	// update PositionV2 related changes
	await context.db
		.update(MintingHubV2PositionV2, { position: event.args.position.toLowerCase() as Address })
		.set({ cooldown: BigInt(cooldown) });

	// ------------------------------------------------------------------
	// COMMON
	await context.db
		.insert(CommonEcosystem)
		.values({
			id: 'MintingHubV2:TotalAvertedBids',
			value: '',
			amount: 1n,
		})
		.onConflictDoUpdate((current) => ({
			amount: current.amount + 1n,
		}));

	await context.db.update(MintingHubV2Status, { position: event.args.position.toLowerCase() as Address }).set((current) => ({
		challengeAvertedBidsCounter: current.challengeAvertedBidsCounter + 1n,
	}));
});

ponder.on('MintingHubV2:ChallengeSucceeded', async ({ event, context }) => {
	const { client } = context;
	const { MintingHubV2, PositionV2 } = context.contracts;

	const challenges = await client.readContract({
		abi: MintingHubV2.abi,
		address: MintingHubV2.address,
		functionName: 'challenges',
		args: [event.args.number],
	});

	const cooldown = await client.readContract({
		abi: PositionV2.abi,
		address: event.args.position,
		functionName: 'cooldown',
	});

	const challenge = await context.db.find(MintingHubV2ChallengeV2, {
		position: event.args.position.toLowerCase() as Address,
		number: event.args.number,
	});

	if (!challenge) throw new Error('ChallengeV2 not found');

	const _bid: number = parseInt(event.args.bid.toString());
	const _size: number = parseInt(event.args.challengeSize.toString());
	const _price: number = (_bid * 10 ** 18) / _size;

	// create ChallengeBidV2 entry
	await context.db.insert(MintingHubV2ChallengeBidV2).values({
		position: event.args.position.toLowerCase() as Address,
		number: event.args.number,
		numberBid: challenge.bids,
		txHash: event.transaction.hash,
		bidder: event.transaction.from,
		created: event.block.timestamp,
		bidType: 'Succeeded',
		bid: event.args.bid,
		price: BigInt(_price),
		filledSize: event.args.challengeSize,
		acquiredCollateral: event.args.acquiredCollateral,
		challengeSize: challenge.size,
	});

	// update ChallengeV2 related changes
	await context.db
		.update(MintingHubV2ChallengeV2, { position: event.args.position.toLowerCase() as Address, number: event.args.number })
		.set((current) => ({
			bids: current.bids + 1n,
			acquiredCollateral: current.acquiredCollateral + event.args.acquiredCollateral,
			filledSize: current.filledSize + event.args.challengeSize,
			status: challenges[3] === 0n ? 'Success' : current.status,
		}));

	// update PositionV2 related changes
	await context.db
		.update(MintingHubV2PositionV2, { position: event.args.position.toLowerCase() as Address })
		.set({ cooldown: BigInt(cooldown) });

	// ------------------------------------------------------------------
	// COMMON
	await context.db
		.insert(CommonEcosystem)
		.values({
			id: 'MintingHubV2:TotalSucceededBids',
			value: '',
			amount: 1n,
		})
		.onConflictDoUpdate((current) => ({
			amount: current.amount + 1n,
		}));

	await context.db.update(MintingHubV2Status, { position: event.args.position.toLowerCase() as Address }).set((current) => ({
		challengeSucceededBidsCounter: current.challengeSucceededBidsCounter + 1n,
	}));
});
