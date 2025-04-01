import { ponder } from '@/generated';
import { PositionV2ABI as PositionABI } from '@frankencoin/zchf';

ponder.on('PositionV2:MintingUpdate', async ({ event, context }) => {
	const { client } = context;
	const { PositionV2, MintingUpdateV2, MintingUpdateMappedCounterV2, ActiveUser } = context.db;
	const { Savings } = context.contracts;

	// event MintingUpdateV2(uint256 collateral, uint256 price, uint256 minted);
	const { collateral, price, minted } = event.args;
	const positionAddress = event.log.address;

	const position = await PositionV2.findUnique({
		id: positionAddress.toLowerCase(),
	});

	if (!position) throw new Error('PositionV2 unknown in MintingUpdate');

	// @dev: https://github.com/Frankencoin-ZCHF/ponder/issues/28
	// position updates
	let availableForClones = 0n;
	let availableForMinting = 0n;
	if (position.isOriginal) {
		availableForClones = await client.readContract({
			abi: PositionABI,
			address: positionAddress,
			functionName: 'availableForClones',
		});
	} else {
		availableForMinting = await client.readContract({
			abi: PositionABI,
			address: positionAddress,
			functionName: 'availableForMinting',
		});
	}

	const cooldown = await client.readContract({
		abi: PositionABI,
		address: positionAddress,
		functionName: 'cooldown',
	});

	const baseRatePPM = await client.readContract({
		abi: Savings.abi,
		address: Savings.address,
		functionName: 'currentRatePPM',
	});

	await PositionV2.update({
		id: positionAddress.toLowerCase(),
		data: {
			collateralBalance: collateral,
			price,
			minted,
			availableForMinting,
			availableForClones,
			cooldown: BigInt(cooldown),
			closed: collateral == 0n,
		},
	});

	// minting updates
	const mintingCounterRaw = await MintingUpdateMappedCounterV2.upsert({
		id: positionAddress.toLowerCase(),
		create: {
			amount: 1n,
		},
		update: ({ current }) => ({
			amount: current.amount + 1n,
		}),
	});

	const mintingCounter = mintingCounterRaw.amount;
	if (mintingCounter === undefined) throw new Error('MintingCounter not found.');

	const idMinting = function (cnt: number | bigint) {
		return `${positionAddress.toLowerCase()}-${cnt}`;
	};

	const annualInterestPPM = baseRatePPM + position.riskPremiumPPM;

	const getFeeTimeframe = function (): number {
		const OneMonth = 60 * 60 * 24 * 30;
		const secToExp = Math.floor(
			parseInt(position.expiration.toString()) - parseInt(event.block.timestamp.toString())
		);
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

	if (mintingCounter === 1n) {
		await MintingUpdateV2.create({
			id: idMinting(1),
			data: {
				count: 1n,
				txHash: event.transaction.hash,
				created: event.block.timestamp,
				position: position.position.toLowerCase(),
				owner: position.owner.toLowerCase(),
				isClone: position.original.toLowerCase() != position.position.toLowerCase(),
				collateral: position.collateral.toLowerCase(),
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
			},
		});
	} else {
		const prev = await MintingUpdateV2.findUnique({
			id: idMinting(mintingCounter - 1n),
		});
		if (prev == null) throw new Error(`previous minting update not found.`);

		const sizeAdjusted = collateral - prev.size;
		const priceAdjusted = price - prev.price;
		const mintedAdjusted = minted - prev.minted;
		const basePremiumPPMAdjusted = baseRatePPM - prev.basePremiumPPM;

		await MintingUpdateV2.create({
			id: idMinting(mintingCounter),
			data: {
				count: mintingCounter,
				txHash: event.transaction.hash,
				created: event.block.timestamp,
				position: position.position.toLowerCase(),
				owner: position.owner.toLowerCase(),
				isClone: position.original.toLowerCase() != position.position.toLowerCase(),
				collateral: position.collateral.toLowerCase(),
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
			},
		});
	}

	// user updates
	await ActiveUser.upsert({
		id: event.transaction.from,
		create: {
			lastActiveTime: event.block.timestamp,
		},
		update: () => ({
			lastActiveTime: event.block.timestamp,
		}),
	});
});

ponder.on('PositionV2:PositionDenied', async ({ event, context }) => {
	const { PositionV2, ActiveUser } = context.db;
	const { client } = context;

	const position = await PositionV2.findUnique({
		id: event.log.address.toLowerCase(),
	});

	const cooldown = await client.readContract({
		abi: PositionABI,
		address: event.log.address,
		functionName: 'cooldown',
	});

	if (position) {
		await PositionV2.update({
			id: event.log.address.toLowerCase(),
			data: {
				cooldown: BigInt(cooldown),
				denied: true,
			},
		});
	}

	await ActiveUser.upsert({
		id: event.transaction.from,
		create: {
			lastActiveTime: event.block.timestamp,
		},
		update: () => ({
			lastActiveTime: event.block.timestamp,
		}),
	});
});

ponder.on('PositionV2:OwnershipTransferred', async ({ event, context }) => {
	const { PositionV2, ActiveUser } = context.db;

	const position = await PositionV2.findUnique({
		id: event.log.address.toLowerCase(),
	});
	if (position) {
		await PositionV2.update({
			id: event.log.address.toLowerCase(),
			data: {
				owner: event.args.newOwner,
			},
		});
	}
	await ActiveUser.upsert({
		id: event.transaction.from,
		create: {
			lastActiveTime: event.block.timestamp,
		},
		update: () => ({
			lastActiveTime: event.block.timestamp,
		}),
	});
});
