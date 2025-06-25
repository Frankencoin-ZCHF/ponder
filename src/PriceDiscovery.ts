import { ADDRESS, OCR2AggregatorABI } from '@frankencoin/zchf';
import { ponder } from 'ponder:registry';
import { PriceDiscovery } from 'ponder:schema';
import { parseUnits } from 'viem';
import { mainnet } from 'viem/chains';

ponder.on('UniswapV3Pool:Swap', async ({ event, context }) => {
	const calc = event.args.sqrtPriceX96 * event.args.sqrtPriceX96;
	const calcDiv = calc / 2n ** 96n;
	const calcMul = calcDiv * parseUnits('1', 18 * 2 - 6);
	const price = calcMul / 2n ** 96n;

	let oracle = 0n;
	try {
		oracle = await context.client.readContract({
			abi: OCR2AggregatorABI,
			address: ADDRESS[mainnet.id].chainlinkOCR2Aggregator,
			functionName: 'latestAnswer',
		});
		oracle = (oracle * 10n ** 18n) / 10n ** 8n;
	} catch (error) {}

	await context.db
		.insert(PriceDiscovery)
		.values({
			sender: event.args.sender,
			txHash: event.transaction.hash,
			source: 'UniswapV3Pool:Swap',
			created: event.block.timestamp,
			blockheight: event.block.number,
			count: 0n,
			price,
			oracle,
		})
		.onConflictDoUpdate((current) => ({
			sender: event.args.sender,
			txHash: event.transaction.hash,
			source: 'UniswapV3Pool:Swap',
			created: event.block.timestamp,
			blockheight: event.block.number,
			count: current.count + 1n,
			price,
			oracle,
		}));
});
