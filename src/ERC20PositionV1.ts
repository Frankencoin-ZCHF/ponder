import { ponder } from 'ponder:registry';
import { indexERC20Balance } from './lib/ERC20Balance';

ponder.on('ERC20PositionV1:Transfer', async ({ event, context }) => {
	// verify from or to is part of PositionV1 addresses
	// index
	// indexERC20Balance(event, context);
});
