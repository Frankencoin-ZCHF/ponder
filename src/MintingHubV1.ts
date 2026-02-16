import { ERC20ABI, PositionV1ABI } from '@frankencoin/zchf';
import { ponder } from 'ponder:registry';
import {
	CommonEcosystem,
	MintingHubV1ChallengeBidV1,
	MintingHubV1ChallengeV1,
	MintingHubV1PositionV1,
	MintingHubV1Status,
} from 'ponder:schema';
import { Address } from 'viem';
import { normalizeAddress } from './lib/utils';

/*
Events

MintingHubV1:PositionOpened
MintingHubV1:ChallengeStarted
MintingHubV1:ChallengeAverted
MintingHubV1:ChallengeSucceeded
*/

ponder.on('MintingHubV1:PositionOpened', async ({ event, context }) => {
	const { client } = context;

	// ------------------------------------------------------------------
	// FROM EVENT & TRANSACTION
	const { position, owner, zchf, collateral, price } = event.args;

	const created: bigint = event.block.timestamp;

	const isOriginal: boolean = !event.transaction.input.includes('0x5cb47919');
	const isClone: boolean = !isOriginal;
	const closed: boolean = false;
	const denied: boolean = false;

	const original: `0x${string}` = isOriginal ? position : (`0x${event.transaction.input.slice(34, 74)}` as `0x${string}`);

	// ------------------------------------------------------------------
	// CONST
	const minimumCollateral = await client.readContract({
		abi: PositionV1ABI,
		address: position,
		functionName: 'minimumCollateral',
	});

	const annualInterestPPM = await client.readContract({
		abi: PositionV1ABI,
		address: position,
		functionName: 'annualInterestPPM',
	});

	const reserveContribution = await client.readContract({
		abi: PositionV1ABI,
		address: position,
		functionName: 'reserveContribution',
	});

	const start = await client.readContract({
		abi: PositionV1ABI,
		address: position,
		functionName: 'start',
	});

	const expiration = await client.readContract({
		abi: PositionV1ABI,
		address: position,
		functionName: 'expiration',
	});

	const challengePeriod = await client.readContract({
		abi: PositionV1ABI,
		address: position,
		functionName: 'challengePeriod',
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
	// TODO: Keep in mind for developer, "limitForClones" is "limit" from SC
	const limitForClones = await client.readContract({
		abi: PositionV1ABI,
		address: position,
		functionName: 'limit',
	});

	// TODO: Keep in mind for developer, "availableForClones" is "limitForClones" from SC
	const availableForClones = await client.readContract({
		abi: PositionV1ABI,
		address: position,
		functionName: 'limitForClones',
	});

	const minted = await client.readContract({
		abi: PositionV1ABI,
		address: position,
		functionName: 'minted',
	});

	const cooldown = await client.readContract({
		abi: PositionV1ABI,
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
		const originalLimitForClones = await client.readContract({
			abi: PositionV1ABI,
			address: original,
			functionName: 'limit',
		});

		const originalAvailableForClones = await client.readContract({
			abi: PositionV1ABI,
			address: original,
			functionName: 'limitForClones',
		});

		await context.db.update(MintingHubV1PositionV1, { position: normalizeAddress(original) }).set({
			limitForClones: originalLimitForClones,
			availableForClones: originalAvailableForClones,
		});
	}

	// ------------------------------------------------------------------
	// ------------------------------------------------------------------
	// ------------------------------------------------------------------
	// Create position entry for DB
	await context.db.insert(MintingHubV1PositionV1).values({
		position: normalizeAddress(position),
		owner,
		zchf,
		collateral,
		price,

		created,
		isOriginal,
		isClone,
		denied,
		denyDate: 0n,
		closed,
		original,

		minimumCollateral,
		annualInterestPPM,
		reserveContribution,
		start,
		cooldown,
		expiration,
		challengePeriod,

		zchfName,
		zchfSymbol,
		zchfDecimals,

		collateralName,
		collateralSymbol,
		collateralDecimals,
		collateralBalance,

		limitForPosition,
		limitForClones,
		availableForPosition,
		availableForClones,
		minted,
	});

	// ------------------------------------------------------------------
	// COMMON

	await context.db
		.insert(CommonEcosystem)
		.values({
			id: 'MintingHubV1:TotalPositions',
			value: '',
			amount: 1n,
		})
		.onConflictDoUpdate((current) => ({
			amount: current.amount + 1n,
		}));

	await context.db
		.insert(MintingHubV1Status)
		.values({
			position: normalizeAddress(event.args.position),
			ownerTransfersCounter: 0n,
			mintingUpdatesCounter: 0n,
			challengeStartedCounter: 0n,
			challengeAvertedBidsCounter: 0n,
			challengeSucceededBidsCounter: 0n,
		})
		.onConflictDoNothing();
});

/**
struct ChallengeV1 {
	address challenger; // the address from which the challenge was initiated
	uint64 start; // the start of the challenge
	IPosition position; // the position that was challenged
	uint256 size; // how much collateral the challenger provided
}
**/
// event ChallengeStarted(address indexed challenger, address indexed position, uint256 size, uint256 number);
// emit ChallengeStarted(msg.sender, address(position), _collateralAmount, pos);
ponder.on('MintingHubV1:ChallengeStarted', async ({ event, context }) => {
	const { client } = context;
	const { MintingHubV1 } = context.contracts;

	const challenges = await client.readContract({
		abi: MintingHubV1.abi,
		address: MintingHubV1.address,
		functionName: 'challenges',
		args: [event.args.number],
	});

	const period = await client.readContract({
		abi: PositionV1ABI,
		address: event.args.position,
		functionName: 'challengePeriod',
	});

	const liqPrice = await client.readContract({
		abi: PositionV1ABI,
		address: event.args.position,
		functionName: 'price',
	});

	await context.db.insert(MintingHubV1ChallengeV1).values({
		position: normalizeAddress(event.args.position),
		number: event.args.number,
		txHash: event.transaction.hash,

		challenger: event.args.challenger,
		start: challenges[1],
		created: event.block.timestamp,
		duration: period,
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
			id: 'MintingHubV1:TotalChallenges',
			value: '',
			amount: 1n,
		})
		.onConflictDoUpdate((current) => ({
			amount: current.amount + 1n,
		}));

	await context.db
		.insert(MintingHubV1Status)
		.values({
			position: normalizeAddress(event.args.position),
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
ponder.on('MintingHubV1:ChallengeAverted', async ({ event, context }) => {
	const { client } = context;
	const { MintingHubV1 } = context.contracts;

	const challenges = await client.readContract({
		abi: MintingHubV1.abi,
		address: MintingHubV1.address,
		functionName: 'challenges',
		args: [event.args.number],
	});

	const cooldown = await client.readContract({
		abi: PositionV1ABI,
		address: event.args.position,
		functionName: 'cooldown',
	});

	const liqPrice = await client.readContract({
		abi: PositionV1ABI,
		address: event.args.position,
		functionName: 'price',
	});

	const challenge = await context.db.find(MintingHubV1ChallengeV1, {
		position: normalizeAddress(event.args.position),
		number: event.args.number,
	});

	if (!challenge) {
		console.error('ChallengeV1 not found in ChallengeAverted event:', {
			position: event.args.position,
			number: event.args.number,
			size: event.args.size,
			txHash: event.transaction.hash,
			blockNumber: event.block.number,
		});
		throw new Error('ChallengeV1 not found');
	}

	// Keep as bigint throughout calculations to preserve precision
	const _amount = (liqPrice * event.args.size) / BigInt(10 ** 18);

	// create ChallengeBidV1 entry
	await context.db.insert(MintingHubV1ChallengeBidV1).values({
		position: normalizeAddress(event.args.position),
		number: event.args.number,
		numberBid: challenge.bids,
		txHash: event.transaction.hash,
		bidder: event.transaction.from,
		created: event.block.timestamp,
		bidType: 'Averted',
		bid: _amount,
		price: liqPrice,
		filledSize: event.args.size,
		acquiredCollateral: 0n,
		challengeSize: challenge.size,
	});

	// update ChallengeV1 related changes
	await context.db
		.update(MintingHubV1ChallengeV1, { position: normalizeAddress(event.args.position), number: event.args.number })
		.set((current) => ({
			bids: current.bids + 1n,
			filledSize: current.filledSize + event.args.size,
			status: challenges[3] === 0n ? 'Success' : current.status,
		}));

	// update PositionV1 related changes
	await context.db.update(MintingHubV1PositionV1, { position: normalizeAddress(event.args.position) }).set({ cooldown });

	// ------------------------------------------------------------------
	// COMMON
	await context.db
		.insert(CommonEcosystem)
		.values({
			id: 'MintingHubV1:TotalAvertedBids',
			value: '',
			amount: 1n,
		})
		.onConflictDoUpdate((current) => ({
			amount: current.amount + 1n,
		}));

	await context.db.update(MintingHubV1Status, { position: normalizeAddress(event.args.position) }).set((current) => ({
		challengeAvertedBidsCounter: current.challengeAvertedBidsCounter + 1n,
	}));
});

ponder.on('MintingHubV1:ChallengeSucceeded', async ({ event, context }) => {
	const { client } = context;
	const { MintingHubV1 } = context.contracts;

	const challenges = await client.readContract({
		abi: MintingHubV1.abi,
		address: MintingHubV1.address,
		functionName: 'challenges',
		args: [event.args.number],
	});

	const cooldown = await client.readContract({
		abi: PositionV1ABI,
		address: event.args.position,
		functionName: 'cooldown',
	});

	const challenge = await context.db.find(MintingHubV1ChallengeV1, {
		position: normalizeAddress(event.args.position),
		number: event.args.number,
	});

	if (!challenge) {
		console.error('ChallengeV1 not found in ChallengeSucceeded event:', {
			position: event.args.position,
			number: event.args.number,
			bid: event.args.bid,
			challengeSize: event.args.challengeSize,
			acquiredCollateral: event.args.acquiredCollateral,
			txHash: event.transaction.hash,
			blockNumber: event.block.number,
		});
		throw new Error('ChallengeV1 not found');
	}

	// Keep as bigint throughout calculations to preserve precision
	const _price = (event.args.bid * BigInt(10 ** 18)) / event.args.challengeSize;

	// create ChallengeBidV1 entry
	await context.db.insert(MintingHubV1ChallengeBidV1).values({
		position: normalizeAddress(event.args.position),
		number: event.args.number,
		numberBid: challenge.bids,
		txHash: event.transaction.hash,
		bidder: event.transaction.from,
		created: event.block.timestamp,
		bidType: 'Succeeded',
		bid: event.args.bid,
		price: _price,
		filledSize: event.args.challengeSize,
		acquiredCollateral: event.args.acquiredCollateral,
		challengeSize: challenge.size,
	});

	// update ChallengeV1 related changes
	await context.db
		.update(MintingHubV1ChallengeV1, { position: normalizeAddress(event.args.position), number: event.args.number })
		.set((current) => ({
			bids: current.bids + 1n,
			acquiredCollateral: current.acquiredCollateral + event.args.acquiredCollateral,
			filledSize: current.filledSize + event.args.challengeSize,
			status: challenges[3] === 0n ? 'Success' : current.status,
		}));

	// update PositionV1 related changes
	await context.db.update(MintingHubV1PositionV1, { position: normalizeAddress(event.args.position) }).set({ cooldown });

	// ------------------------------------------------------------------
	// COMMON
	await context.db
		.insert(CommonEcosystem)
		.values({
			id: 'MintingHubV1:TotalSucceededBids',
			value: '',
			amount: 1n,
		})
		.onConflictDoUpdate((current) => ({
			amount: current.amount + 1n,
		}));

	await context.db.update(MintingHubV1Status, { position: normalizeAddress(event.args.position) }).set((current) => ({
		challengeSucceededBidsCounter: current.challengeSucceededBidsCounter + 1n,
	}));
});
