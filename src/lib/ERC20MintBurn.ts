import { ponder, Event, type Context } from 'ponder:registry';
import { ERC20Counter } from 'ponder:schema';
import { Address, zeroAddress } from 'viem';

export async function indexERC20MintBurn(
	event: Event<'ERC20:Transfer' | 'ERC20PositionV1:Transfer' | 'ERC20PositionV2:Transfer'>,
	context: Context<'ERC20:Transfer' | 'ERC20PositionV1:Transfer' | 'ERC20PositionV2:Transfer'>
) {
	const token = event.log.address.toLowerCase() as Address;
	const from = event.args.from.toLowerCase() as Address;
	const to = event.args.to.toLowerCase() as Address;
	const updated = event.block.timestamp;

	// emit Transfer(address(0), recipient, amount);
	if (from == zeroAddress) {
		// update counter
		const counter = await context.db
			.insert(ERC20Counter)
			.values({
				token,
				updated,
				mint: 1n,
				burn: 0n,
				balance: 0n,
			})
			.onConflictDoUpdate((current) => ({
				updated,
				mint: current.mint + 1n,
			}));
	}
}
