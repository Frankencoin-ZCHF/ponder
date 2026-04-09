import { onchainTable, primaryKey } from 'ponder';

export const MintingHubV2Status = onchainTable(
	'MintingHubV2Status',
	(t) => ({
		position: t.hex().notNull(),
		ownerTransfersCounter: t.bigint().notNull(),
		mintingUpdatesCounter: t.bigint().notNull(),
		challengeStartedCounter: t.bigint().notNull(),
		challengeAvertedBidsCounter: t.bigint().notNull(),
		challengeSucceededBidsCounter: t.bigint().notNull(),
	}),
	(table) => ({
		pk: primaryKey({
			columns: [table.position],
		}),
	})
);

export const MintingHubV2PositionV2 = onchainTable(
	'MintingHubV2PositionV2',
	(t) => ({
		position: t.hex().notNull(),
		owner: t.hex().notNull(),
		zchf: t.hex().notNull(),
		collateral: t.hex().notNull(),
		price: t.bigint().notNull(),
		created: t.bigint().notNull(), // block timestamp when position was created
		isOriginal: t.boolean().notNull(),
		isClone: t.boolean().notNull(),
		denied: t.boolean().notNull(),
		denyDate: t.bigint().notNull(),
		closed: t.boolean().notNull(),
		original: t.hex().notNull(),
		parent: t.hex().notNull(),
		minimumCollateral: t.bigint().notNull(),
		riskPremiumPPM: t.integer().notNull(),
		reserveContribution: t.integer().notNull(),
		start: t.bigint().notNull(),
		cooldown: t.bigint().notNull(),
		expiration: t.bigint().notNull(),
		challengePeriod: t.bigint().notNull(),
		zchfName: t.text().notNull(),
		zchfSymbol: t.text().notNull(),
		zchfDecimals: t.integer().notNull(),
		collateralName: t.text().notNull(),
		collateralSymbol: t.text().notNull(),
		collateralDecimals: t.integer().notNull(),
		collateralBalance: t.bigint().notNull(),
		limitForClones: t.bigint().notNull(), // global limit for position and their clones
		availableForClones: t.bigint().notNull(), // for positions or clones for further clones
		availableForMinting: t.bigint().notNull(), // "unlocked" to mint for position
		minted: t.bigint().notNull(), // position minted amount
	}),
	(table) => ({
		pk: primaryKey({
			columns: [table.position],
		}),
	})
);

export const MintingHubV2OwnerTransfersV2 = onchainTable(
	'MintingHubV2OwnerTransfersV2',
	(t) => ({
		version: t.integer().notNull(),
		count: t.bigint().notNull(),
		txHash: t.hex().notNull(),
		created: t.bigint().notNull(),
		position: t.hex().notNull(),
		previousOwner: t.hex().notNull(),
		newOwner: t.hex().notNull(),
	}),
	(table) => ({
		pk: primaryKey({
			columns: [table.position, table.count],
		}),
	})
);

export const MintingHubV2MintingUpdateV2 = onchainTable(
	'MintingHubV2MintingUpdateV2',
	(t) => ({
		count: t.bigint().notNull(),
		txHash: t.hex().notNull(),
		created: t.bigint().notNull(),
		position: t.hex().notNull(),
		owner: t.hex().notNull(),
		isClone: t.boolean().notNull(),
		collateral: t.hex().notNull(),
		collateralName: t.text().notNull(),
		collateralSymbol: t.text().notNull(),
		collateralDecimals: t.integer().notNull(),
		size: t.bigint().notNull(),
		price: t.bigint().notNull(),
		minted: t.bigint().notNull(),
		sizeAdjusted: t.bigint().notNull(),
		priceAdjusted: t.bigint().notNull(),
		mintedAdjusted: t.bigint().notNull(),
		annualInterestPPM: t.integer().notNull(),
		basePremiumPPM: t.integer().notNull(),
		riskPremiumPPM: t.integer().notNull(),
		reserveContribution: t.integer().notNull(),
		feeTimeframe: t.integer().notNull(),
		feePPM: t.integer().notNull(),
		feePaid: t.bigint().notNull(),
	}),
	(table) => ({
		pk: primaryKey({
			columns: [table.position, table.count],
		}),
	})
);

export const MintingHubV2ChallengeV2 = onchainTable(
	'MintingHubV2ChallengeV2',
	(t) => ({
		position: t.hex().notNull(), // position being challenged
		number: t.bigint().notNull(), // number of the challenge in minting hub
		txHash: t.hex().notNull(),
		challenger: t.hex().notNull(),
		start: t.bigint().notNull(), // timestamp for start of challenge
		created: t.bigint().notNull(), // block timestamp when challenge was created
		duration: t.bigint().notNull(),
		size: t.bigint().notNull(), // size of the challenge, set by the challenger
		liqPrice: t.bigint().notNull(), // trigger price for challenge
		bids: t.bigint().notNull(), // number of bids, starting with 0
		filledSize: t.bigint().notNull(), // accumulated bids amounts, set by the bidders
		acquiredCollateral: t.bigint().notNull(), // total amount of collateral acquired, set by the bidders
		status: t.text().notNull(), // status: "Active" | "Success"
	}),
	(table) => ({
		pk: primaryKey({
			columns: [table.position, table.number],
		}),
	})
);

export const MintingHubV2ChallengeBidV2 = onchainTable(
	'MintingHubV2ChallengeBidV2',
	(t) => ({
		position: t.hex().notNull(),
		number: t.bigint().notNull(),
		numberBid: t.bigint().notNull(),
		txHash: t.hex().notNull(),
		bidder: t.hex().notNull(),
		created: t.bigint().notNull(), // block timestamp when bid was created
		bidType: t.text().notNull(), // "Averted" | "Succeeded"
		bid: t.bigint().notNull(), // bid amount
		price: t.bigint().notNull(), // bid price
		filledSize: t.bigint().notNull(),
		acquiredCollateral: t.bigint().notNull(),
		challengeSize: t.bigint().notNull(),
	}),
	(table) => ({
		pk: primaryKey({
			columns: [table.position, table.number, table.numberBid],
		}),
	})
);
