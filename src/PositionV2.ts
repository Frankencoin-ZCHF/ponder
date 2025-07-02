import { ADDRESS, SavingsV2ABI } from '@frankencoin/zchf';
import { ponder } from 'ponder:registry';
import { MintingHubV2MintingUpdateV2, MintingHubV2PositionV2, MintingHubV2Status } from 'ponder:schema';
import { Address } from 'viem';
import { mainnet } from 'viem/chains';

/*
Events

PositionV2:MintingUpdate
PositionV2:PositionDenied
PositionV2:OwnershipTransferred
*/

ponder.on('PositionV2:MintingUpdate', async ({ event, context }) => {
	const { client } = context;
	const { PositionV2, SavingsV2 } = context.contracts;

	// event MintingUpdateV2(uint256 collateral, uint256 price, uint256 minted);
	const { collateral, price, minted } = event.args;
	const positionAddress = event.log.address;

	const position = await context.db.find(MintingHubV2PositionV2, {
		position: positionAddress.toLowerCase() as Address,
	});

	if (!position) throw new Error('PositionV2 unknown in MintingUpdate');

	// @dev: https://github.com/Frankencoin-ZCHF/ponder/issues/28
	// position updates
	let availableForClones = 0n;
	let availableForMinting = 0n;
	if (position.isOriginal) {
		availableForClones = await client.readContract({
			abi: PositionV2.abi,
			address: positionAddress,
			functionName: 'availableForClones',
		});
	} else {
		availableForMinting = await client.readContract({
			abi: PositionV2.abi,
			address: positionAddress,
			functionName: 'availableForMinting',
		});
	}

	const cooldown = await client.readContract({
		abi: PositionV2.abi,
		address: positionAddress,
		functionName: 'cooldown',
	});

	const baseRatePPM = await client.readContract({
		abi: SavingsV2ABI,
		address: ADDRESS[mainnet.id].savingsV2,
		functionName: 'currentRatePPM',
	});

	await context.db
		.update(MintingHubV2PositionV2, {
			position: positionAddress.toLowerCase() as Address,
		})
		.set({
			collateralBalance: collateral,
			price,
			minted,
			availableForMinting,
			availableForClones,
			cooldown: BigInt(cooldown),
			closed: collateral == 0n,
		});

	// update minting counter
	const status = await context.db
		.insert(MintingHubV2Status)
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

	const annualInterestPPM = baseRatePPM + position.riskPremiumPPM;

	const getFeeTimeframe = function (): number {
		const OneMonth = 60 * 60 * 24 * 30;
		const secToExp = Math.floor(parseInt(position.expiration.toString()) - parseInt(event.block.timestamp.toString()));
		return Math.max(OneMonth, secToExp);
	};

	const getFeePPM = function (): bigint {
		const OneYear = 60 * 60 * 24 * 365;
		const calc: number = (getFeeTimeframe() * (baseRatePPM + position.riskPremiumPPM)) / OneYear;
		return BigInt(Math.floor(calc));
	};

	const getFeePaid = function (amount: bigint): bigint {
		return (getFeePPM() * amount) / 1_000_000n;
	};

	if (status.mintingUpdatesCounter === 1n) {
		await context.db.insert(MintingHubV2MintingUpdateV2).values({
			count: 1n,
			txHash: event.transaction.hash,
			created: event.block.timestamp,
			position: position.position.toLowerCase() as Address,
			owner: position.owner.toLowerCase() as Address,
			isClone: position.original.toLowerCase() != position.position.toLowerCase(),
			collateral: position.collateral.toLowerCase() as Address,
			collateralName: position.collateralName,
			collateralSymbol: position.collateralSymbol,
			collateralDecimals: position.collateralDecimals,
			size: collateral,
			price: price,
			minted: minted,
			sizeAdjusted: collateral,
			priceAdjusted: price,
			mintedAdjusted: minted,
			annualInterestPPM: annualInterestPPM,
			basePremiumPPM: baseRatePPM,
			riskPremiumPPM: position.riskPremiumPPM,
			reserveContribution: position.reserveContribution,
			feeTimeframe: getFeeTimeframe(),
			feePPM: parseInt(getFeePPM().toString()),
			feePaid: getFeePaid(minted),
		});
	} else {
		const prev = await context.db.find(MintingHubV2MintingUpdateV2, {
			position: position.position.toLowerCase() as Address,
			count: status.mintingUpdatesCounter - 1n,
		});
		if (prev == null) throw new Error(`previous minting update not found.`);

		const sizeAdjusted = collateral - prev.size;
		const priceAdjusted = price - prev.price;
		const mintedAdjusted = minted - prev.minted;
		const basePremiumPPMAdjusted = baseRatePPM - prev.basePremiumPPM;

		await context.db.insert(MintingHubV2MintingUpdateV2).values({
			count: status.mintingUpdatesCounter,
			txHash: event.transaction.hash,
			created: event.block.timestamp,
			position: position.position.toLowerCase() as Address,
			owner: position.owner.toLowerCase() as Address,
			isClone: position.original.toLowerCase() != position.position.toLowerCase(),
			collateral: position.collateral.toLowerCase() as Address,
			collateralName: position.collateralName,
			collateralSymbol: position.collateralSymbol,
			collateralDecimals: position.collateralDecimals,
			size: collateral,
			price: price,
			minted: minted,
			sizeAdjusted,
			priceAdjusted,
			mintedAdjusted,
			annualInterestPPM,
			basePremiumPPM: baseRatePPM,
			riskPremiumPPM: position.riskPremiumPPM,
			reserveContribution: position.reserveContribution,
			feeTimeframe: getFeeTimeframe(),
			feePPM: parseInt(getFeePPM().toString()),
			feePaid: mintedAdjusted > 0n ? getFeePaid(mintedAdjusted) : 0n,
		});
	}
});

ponder.on('PositionV2:PositionDenied', async ({ event, context }) => {
	const { client } = context;

	const position = await context.db.find(MintingHubV2PositionV2, {
		position: event.log.address.toLowerCase() as Address,
	});

	const cooldown = await client.readContract({
		abi: context.contracts.PositionV2.abi,
		address: event.log.address,
		functionName: 'cooldown',
	});

	if (position) {
		await context.db
			.update(MintingHubV2PositionV2, {
				position: event.log.address.toLowerCase() as Address,
			})
			.set({
				cooldown: BigInt(cooldown),
				denied: true,
			});
	}
});

ponder.on('PositionV2:OwnershipTransferred', async ({ event, context }) => {
	const position = await context.db.find(MintingHubV2PositionV2, {
		position: event.log.address.toLowerCase() as Address,
	});

	if (position) {
		await context.db
			.update(MintingHubV2PositionV2, {
				position: event.log.address.toLowerCase() as Address,
			})
			.set({
				owner: event.args.newOwner.toLowerCase() as Address,
			});
	}
});
