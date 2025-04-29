import { ponder } from '@/generated';
import { ADDRESS, ReferenceTransferABI } from '@frankencoin/zchf';
import { chain } from '../ponder.config';

ponder.on('ReferenceTransfer:Transfer', async ({ event, context }) => {
	const { ReferenceTransfer, Ecosystem } = context.db;
	const { from, to, amount, ref } = event.args;

	const autoSaved = await context.client.readContract({
		address: ADDRESS[chain.id]!.referenceTransfer,
		abi: ReferenceTransferABI,
		functionName: 'hasAutoSave',
		args: [to],
	});

	const counter = await Ecosystem.upsert({
		id: 'ReferenceTransfer:TransferCounter',
		create: {
			value: '',
			amount: 1n,
		},
		update: ({ current }) => ({
			amount: current.amount + 1n,
		}),
	});

	// flat indexing
	const entry = await ReferenceTransfer.create({
		id: `${from.toLowerCase()}-${to.toLowerCase()}-${counter.amount}`,
		data: {
			count: counter.amount,
			created: event.block.timestamp,
			txHash: event.transaction.hash,
			from: from.toLowerCase(),
			to: to.toLowerCase(),
			amount,
			ref,
			autoSaved,
		},
	});
});
