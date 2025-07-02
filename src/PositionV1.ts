import { ponder } from 'ponder:registry';
import { MintingHubV1MintingUpdateV1, MintingHubV1PositionV1, MintingHubV1Status } from 'ponder:schema';
import { Address } from 'viem';

/*
Events

PositionV1:MintingUpdate
PositionV1:PositionDenied
PositionV1:OwnershipTransferred
*/

ponder.on('PositionV1:MintingUpdate', async ({ event, context }) => {
	const { client } = context;

	// event MintingUpdateV1(uint256 collateral, uint256 price, uint256 minted, uint256 limit);
	const { collateral, price, minted, limit } = event.args;
	const positionAddress = event.log.address;

	// position updates
	const availableForClones = await client.readContract({
		abi: context.contracts.PositionV1.abi,
		address: positionAddress,
		functionName: 'limitForClones',
	});

	const cooldown = await client.readContract({
		abi: context.contracts.PositionV1.abi,
		address: positionAddress,
		functionName: 'cooldown',
	});

	const position = await context.db.find(MintingHubV1PositionV1, {
		position: positionAddress.toLowerCase() as Address,
	});

	if (position) {
		const limitForPosition = (collateral * price) / BigInt(10 ** position.zchfDecimals);
		const availableForPosition = limitForPosition - minted;

		await context.db
			.update(MintingHubV1PositionV1, {
				position: positionAddress.toLowerCase() as Address,
			})
			.set({
				collateralBalance: collateral,
				price,
				minted,
				limitForPosition,
				limitForClones: limit,
				availableForPosition,
				availableForClones,
				cooldown,
				closed: collateral == 0n,
			});
	}

	// update minting counter
	const status = await context.db
		.insert(MintingHubV1Status)
		.values({
			position: positionAddress.toLowerCase() as Address,
			mintingUpdatesCounter: 1n,
			challengeStartedCounter: 0n,
			challengeAvertedBidsCounter: 0n,
			challengeSucceededBidsCounter: 0n,
		})
		.onConflictDoUpdate((current) => ({
			mintingUpdatesCounter: current.mintingUpdatesCounter + 1n,
		}));

	let missingPositionData: {
		position: string;
		owner: string;
		original: string;
		expiration: bigint;
		annualInterestPPM: number;
		reserveContribution: number;
		collateral: string;
		collateralName: string;
		collateralSymbol: string;
		collateralDecimals: number;
	};

	// @dev: issue due to "wrong" event sequence within the smart contracts
	if (position === null) {
		const owner = await client.readContract({
			abi: context.contracts.PositionV1.abi,
			address: positionAddress,
			functionName: 'owner',
		});

		const original = await client.readContract({
			abi: context.contracts.PositionV1.abi,
			address: positionAddress,
			functionName: 'original',
		});

		const expiration = await client.readContract({
			abi: context.contracts.PositionV1.abi,
			address: positionAddress,
			functionName: 'expiration',
		});

		const annualInterestPPM = await client.readContract({
			abi: context.contracts.PositionV1.abi,
			address: positionAddress,
			functionName: 'annualInterestPPM',
		});

		const reserveContribution = await client.readContract({
			abi: context.contracts.PositionV1.abi,
			address: positionAddress,
			functionName: 'reserveContribution',
		});

		const collateralAddress = await client.readContract({
			abi: context.contracts.PositionV1.abi,
			address: positionAddress,
			functionName: 'collateral',
		});

		const collateralName = await client.readContract({
			abi: context.contracts.ERC20.abi,
			address: collateralAddress,
			functionName: 'name',
		});

		const collateralSymbol = await client.readContract({
			abi: context.contracts.ERC20.abi,
			address: collateralAddress,
			functionName: 'symbol',
		});

		const collateralDecimals = await client.readContract({
			abi: context.contracts.ERC20.abi,
			address: collateralAddress,
			functionName: 'decimals',
		});

		missingPositionData = {
			position: positionAddress,
			owner,
			original,
			expiration,
			annualInterestPPM,
			reserveContribution,
			collateral: collateralAddress,
			collateralName,
			collateralSymbol,
			collateralDecimals,
		};
	} else {
		missingPositionData = {
			position: position.position,
			owner: position.owner,
			original: position.original,
			expiration: position.expiration,
			annualInterestPPM: position.annualInterestPPM,
			reserveContribution: position.reserveContribution,
			collateral: position.collateral,
			collateralName: position.collateralName,
			collateralSymbol: position.collateralSymbol,
			collateralDecimals: position.collateralDecimals,
		};
	}

	const getFeeTimeframe = function (): number {
		const OneMonth = 60 * 60 * 24 * 30;
		const secToExp = Math.floor(parseInt(missingPositionData.expiration.toString()) - parseInt(event.block.timestamp.toString()));
		return Math.max(OneMonth, secToExp);
	};

	const getFeePPM = function (): bigint {
		const OneYear = 60 * 60 * 24 * 365;
		const calc: number = (getFeeTimeframe() * missingPositionData.annualInterestPPM) / OneYear;
		return BigInt(Math.floor(calc));
	};

	const getFeePaid = function (amount: bigint): bigint {
		return (getFeePPM() * amount) / 1_000_000n;
	};

	if (status.mintingUpdatesCounter === 1n) {
		await context.db.insert(MintingHubV1MintingUpdateV1).values({
			count: 1n,
			txHash: event.transaction.hash,
			created: event.block.timestamp,
			position: missingPositionData.position.toLowerCase() as Address,
			owner: missingPositionData.owner.toLowerCase() as Address,
			isClone: missingPositionData.original.toLowerCase() != missingPositionData.position.toLowerCase(),
			collateral: missingPositionData.collateral.toLowerCase() as Address,
			collateralName: missingPositionData.collateralName,
			collateralSymbol: missingPositionData.collateralSymbol,
			collateralDecimals: missingPositionData.collateralDecimals,
			size: collateral,
			price: price,
			minted: minted,
			sizeAdjusted: collateral,
			priceAdjusted: price,
			mintedAdjusted: minted,
			annualInterestPPM: missingPositionData.annualInterestPPM,
			reserveContribution: missingPositionData.reserveContribution,
			feeTimeframe: getFeeTimeframe(),
			feePPM: parseInt(getFeePPM().toString()),
			feePaid: getFeePaid(minted),
		});
	} else {
		const prev = await context.db.find(MintingHubV1MintingUpdateV1, {
			position: missingPositionData.position.toLowerCase() as Address,
			count: status.mintingUpdatesCounter - 1n,
		});
		if (prev == null) throw new Error(`previous minting update not found.`);

		const sizeAdjusted = collateral - prev.size;
		const priceAdjusted = price - prev.price;
		const mintedAdjusted = minted - prev.minted;

		await context.db.insert(MintingHubV1MintingUpdateV1).values({
			count: status.mintingUpdatesCounter,
			txHash: event.transaction.hash,
			created: event.block.timestamp,
			position: missingPositionData.position.toLowerCase() as Address,
			owner: missingPositionData.owner.toLowerCase() as Address,
			isClone: missingPositionData.original.toLowerCase() != missingPositionData.position.toLowerCase(),
			collateral: missingPositionData.collateral.toLowerCase() as Address,
			collateralName: missingPositionData.collateralName,
			collateralSymbol: missingPositionData.collateralSymbol,
			collateralDecimals: missingPositionData.collateralDecimals,
			size: collateral,
			price: price,
			minted: minted,
			sizeAdjusted,
			priceAdjusted,
			mintedAdjusted,
			annualInterestPPM: missingPositionData.annualInterestPPM,
			reserveContribution: missingPositionData.reserveContribution,
			feeTimeframe: getFeeTimeframe(),
			feePPM: parseInt(getFeePPM().toString()),
			feePaid: mintedAdjusted > 0n ? getFeePaid(mintedAdjusted) : 0n,
		});
	}
});

ponder.on('PositionV1:PositionDenied', async ({ event, context }) => {
	const { client } = context;

	const position = await context.db.find(MintingHubV1PositionV1, {
		position: event.log.address.toLowerCase() as Address,
	});

	const cooldown = await client.readContract({
		abi: context.contracts.PositionV1.abi,
		address: event.log.address,
		functionName: 'cooldown',
	});

	if (position) {
		await context.db
			.update(MintingHubV1PositionV1, {
				position: event.log.address.toLowerCase() as Address,
			})
			.set({
				cooldown,
				denied: true,
			});
	}
});

ponder.on('PositionV1:OwnershipTransferred', async ({ event, context }) => {
	const position = await context.db.find(MintingHubV1PositionV1, {
		position: event.log.address.toLowerCase() as Address,
	});

	if (position) {
		await context.db
			.update(MintingHubV1PositionV1, {
				position: event.log.address.toLowerCase() as Address,
			})
			.set({
				owner: event.args.newOwner.toLowerCase() as Address,
			});
	}
});
