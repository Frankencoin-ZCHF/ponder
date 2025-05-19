import { ponder } from 'ponder:registry';
import { indexERC20Balance } from './lib/ERC20Balance';

ponder.on('ERC20PositionV2:Transfer', async ({ event, context }) => {
	// verify from or to is part of PositionV2 addresses
	// index
	// indexERC20Balance(event, context);
});
