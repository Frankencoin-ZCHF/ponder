import { ponder, Event, type Context } from 'ponder:registry';
import { ERC20Balance, ERC20BalanceMapping, ERC20Counter } from 'ponder:schema';
import { Address, zeroAddress } from 'viem';

export async function indexERC20Balance(
	event: Event<'ERC20:Transfer' | 'ERC20PositionV1:Transfer' | 'ERC20PositionV2:Transfer'>,
	context: Context<'ERC20:Transfer' | 'ERC20PositionV1:Transfer' | 'ERC20PositionV2:Transfer'>
) {
	const token = event.log.address.toLowerCase() as Address;
	const from = event.args.from.toLowerCase() as Address;
	const to = event.args.to.toLowerCase() as Address;
	const updated = event.block.timestamp;

	// update counter
	const counter = await context.db
		.insert(ERC20Counter)
		.values({
			token,
			updated,
			mint: 0n,
			burn: 0n,
			balance: 1n,
		})
		.onConflictDoUpdate((current) => ({
			updated,
			balance: current.balance + 1n,
		}));

	// make latest balance available
	let balanceFrom = 0n;
	let balanceTo = 0n;

	// update balance from
	if (from != zeroAddress) {
		const balance = await context.db.update(ERC20BalanceMapping, { token, account: from }).set((current) => ({
			updated,
			balance: current.balance - event.args.value, // deduct balance
		}));
		balanceFrom = balance.balance;
	}

	// update balance from
	if (to != zeroAddress) {
		const balance = await context.db
			.insert(ERC20BalanceMapping)
			.values({
				updated,
				token,
				account: event.args.to.toLowerCase() as Address,
				balance: event.args.value,
			})
			.onConflictDoUpdate((current) => ({
				updated,
				balance: current.balance + event.args.value,
			}));
		balanceTo = balance.balance;
	}

	// index balance history, entry
	const entry = await context.db.insert(ERC20Balance).values({
		txHash: event.transaction.hash,
		token,
		created: updated,
		blockheight: event.block.number,
		count: counter.balance,
		from,
		to,
		amount: event.args.value,
		balanceFrom,
		balanceTo,
	});

	console.log(entry);
}
