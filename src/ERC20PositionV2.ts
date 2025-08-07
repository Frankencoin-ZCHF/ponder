import { ponder } from 'ponder:registry';
import { indexERC20Balance } from './lib/ERC20Balance';

ponder.on('ERC20PositionV2:Transfer', async ({ event, context }) => {
	// console.log(event.log.address);
	// console.log(event.args);
	// verify from or to is part of PositionV2 addresses
	// index
	// await indexERC20Balance(event, context);
});
