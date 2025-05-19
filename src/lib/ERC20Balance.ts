import { ponder, Event, type Context } from 'ponder:registry';

export function indexERC20Balance(
	event: Event<'ERC20:Transfer' | 'ERC20PositionV2:Transfer'>,
	context: Context<'ERC20:Transfer' | 'ERC20PositionV2:Transfer'>
) {
	console.log(event.log.address);
}
