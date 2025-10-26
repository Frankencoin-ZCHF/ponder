import { Event, type Context } from 'ponder:registry';
import { ERC20Burn, ERC20Status, ERC20Mint, ERC20BalanceMapping, ERC20TotalSupply } from 'ponder:schema';
import { Address, zeroAddress } from 'viem';
import { updateTransactionLog } from './TransactionLog';
import { ADDRESS, ChainMain } from '@frankencoin/zchf';

export async function indexERC20MintBurn(
	event: Event<'ERC20:Transfer' | 'ERC20PositionV1:Transfer' | 'ERC20PositionV2:Transfer'>,
	context: Context<'ERC20:Transfer' | 'ERC20PositionV1:Transfer' | 'ERC20PositionV2:Transfer'>
) {
	const token = event.log.address.toLowerCase() as Address;
	const from = event.args.from.toLowerCase() as Address;
	const to = event.args.to.toLowerCase() as Address;
	const value = event.args.value;
	const updated = event.block.timestamp;
	const chainId = context.chain.id;

	const date = new Date(Number(updated)).setUTCHours(0, 0, 0, 0);

	let frankencoinContract: Address = zeroAddress;
	if (chainId == ChainMain.mainnet.id) {
		frankencoinContract = ADDRESS[chainId].frankencoin;
	} else {
		frankencoinContract = ADDRESS[chainId].ccipBridgedFrankencoin;
	}

	const equityContract: Address = ADDRESS[ChainMain.mainnet.id].equity;

	let kindContract: string = 'Token';
	const compare = (a: string, b: string) => a.toLowerCase() == b.toLowerCase();
	if (compare(token, frankencoinContract)) kindContract = 'Frankencoin';
	else if (compare(token, equityContract)) kindContract = 'Equity';

	// ### minting tokens ###
	if (from == zeroAddress) {
		// update status
		const status = await context.db
			.insert(ERC20Status)
			.values({
				chainId,
				token,
				updated,
				mint: 1n,
				burn: 0n,
				balance: 0n,
				supply: 0n,
			})
			.onConflictDoUpdate((current) => ({
				updated,
				mint: current.mint + 1n,
			}));

		// flat indexing
		await context.db.insert(ERC20Mint).values({
			chainId,
			txHash: event.transaction.hash,
			token,
			created: updated,
			blockheight: event.block.number,
			count: status.mint,
			to,
			amount: value,
		});

		// update status
		const responseStatus = await context.db.update(ERC20Status, { chainId, token }).set((current) => ({
			supply: current.supply + value,
		}));

		// flat total supply
		await context.db
			.insert(ERC20TotalSupply)
			.values({
				chainId,
				token,
				created: BigInt(date),
				supply: responseStatus.supply,
			})
			.onConflictDoUpdate((current) => ({
				supply: responseStatus.supply,
			}));

		// global updating
		// await context.db
		// 	.insert(CommonEcosystem)
		// 	.values({
		// 		id: 'Frankencoin:Mint',
		// 		value: '',
		// 		amount: value,
		// 	})
		// 	.onConflictDoUpdate((current) => ({
		// 		amount: current.amount ? current.amount + value : value,
		// 	}));

		// balance updating
		await context.db
			.insert(ERC20BalanceMapping)
			.values({
				chainId,
				token,
				updated,
				account: to,
				mint: value,
				burn: 0n,
				balance: 0n,
			})
			.onConflictDoUpdate((current) => ({
				mint: current.mint + value,
			}));

		// make transaction log entry
		await updateTransactionLog({
			client: context.client,
			db: context.db,
			chainId,
			timestamp: event.block.timestamp,
			kind: `${kindContract}:Mint`,
			amount: event.args.value,
			txHash: event.transaction.hash,
		});
	}

	// ### burning tokens ###
	if (event.args.to === zeroAddress) {
		// update counter
		const counter = await context.db
			.insert(ERC20Status)
			.values({
				chainId,
				token,
				updated,
				mint: 0n,
				burn: 1n,
				balance: 0n,
				supply: 0n,
			})
			.onConflictDoUpdate((current) => ({
				updated,
				burn: current.burn + 1n,
			}));

		// flat indexing
		await context.db.insert(ERC20Burn).values({
			chainId,
			txHash: event.transaction.hash,
			token,
			created: updated,
			blockheight: event.block.number,
			count: counter.burn,
			from,
			amount: value,
		});

		// update status
		const responseStatus = await context.db.update(ERC20Status, { chainId, token }).set((current) => ({
			supply: current.supply - value,
		}));

		// flat total supply
		await context.db
			.insert(ERC20TotalSupply)
			.values({
				chainId,
				token,
				created: BigInt(date),
				supply: responseStatus.supply,
			})
			.onConflictDoUpdate((current) => ({
				supply: responseStatus.supply,
			}));

		// // global updating
		// await context.db
		// 	.insert(CommonEcosystem)
		// 	.values({
		// 		id: 'Frankencoin:Burn',
		// 		value: '',
		// 		amount: value,
		// 	})
		// 	.onConflictDoUpdate((current) => ({
		// 		amount: current.amount ? current.amount + value : value,
		// 	}));

		// mint burn mapper updating
		await context.db
			.insert(ERC20BalanceMapping)
			.values({
				chainId,
				token,
				account: from,
				updated,
				mint: 0n,
				burn: value,
				balance: 0n,
			})
			.onConflictDoUpdate((current) => ({
				burn: current.burn ? current.burn + value : value,
			}));

		// make transaction log entry
		await updateTransactionLog({
			client: context.client,
			db: context.db,
			chainId,
			timestamp: event.block.timestamp,
			kind: `${kindContract}:Burn`,
			amount: event.args.value,
			txHash: event.transaction.hash,
		});
	}
}
