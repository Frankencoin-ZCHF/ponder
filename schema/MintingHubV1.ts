import { onchainTable } from 'ponder';

export const MintingHubV1PositionV1 = onchainTable('PositionV1', (t) => ({
	id: t.text().primaryKey(),
	position: t.hex().notNull(),
	owner: t.hex().notNull(),
	zchf: t.hex().notNull(),
	collateral: t.hex().notNull(),
	price: t.bigint().notNull(),
	created: t.bigint().notNull(), // block timestamp when position was created
	isOriginal: t.boolean().notNull(),
	isClone: t.boolean().notNull(),
	denied: t.boolean().notNull(),
	closed: t.boolean().notNull(),
	original: t.hex().notNull(),
	minimumCollateral: t.bigint().notNull(),
	annualInterestPPM: t.integer().notNull(),
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
	limitForPosition: t.bigint().notNull(),
	limitForClones: t.bigint().notNull(),
	availableForPosition: t.bigint().notNull(),
	availableForClones: t.bigint().notNull(),
	minted: t.bigint().notNull(),
}));

export const MintingHubV1MintingUpdateV1 = onchainTable('MintingUpdateV1', (t) => ({
	id: t.text().primaryKey(),
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
	reserveContribution: t.integer().notNull(),
	feeTimeframe: t.integer().notNull(),
	feePPM: t.integer().notNull(),
	feePaid: t.bigint().notNull(),
}));

export const MintingUpdateV1MappedCounterV1 = onchainTable('MintingUpdateV1MappedCounterV1', (t) => ({
	id: t.hex().primaryKey(),
	amount: t.bigint().notNull(),
}));

export const MintingHubV1ChallengeV1 = onchainTable('ChallengeV1', (t) => ({
	id: t.text().primaryKey(), // e.g. 0x5d0e66DC411FEfBE9cAe9CE56dA9BCE8C027f492-challenge-2
	position: t.hex().notNull(), // position being challenged
	number: t.bigint().notNull(), // number of the challenge in minting hub
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
}));

export const MintingHubV1ChallengeBidV1 = onchainTable('ChallengeBidV1', (t) => ({
	id: t.text().primaryKey(), // e.g. 0x5d0e66DC411FEfBE9cAe9CE56dA9BCE8C027f492-challenge-2-bid-0
	position: t.hex().notNull(),
	number: t.bigint().notNull(),
	numberBid: t.bigint().notNull(),
	bidder: t.hex().notNull(),
	created: t.bigint().notNull(), // block timestamp when bid was created
	bidType: t.text().notNull(), // "Averted" | "Succeeded"
	bid: t.bigint().notNull(), // bid amount
	price: t.bigint().notNull(), // bid price
	filledSize: t.bigint().notNull(),
	acquiredCollateral: t.bigint().notNull(),
	challengeSize: t.bigint().notNull(),
}));
