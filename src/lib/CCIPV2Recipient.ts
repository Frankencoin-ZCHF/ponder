import { bytesToHex, decodeEventLog, encodeAbiParameters, hexToBytes, keccak256, parseAbi, toEventSelector } from 'viem';
import type { Address, Hex, Log } from 'viem';

// Chainlink CCIP v2 OnRamp event:
// https://docs.chain.link/ccip/evm/api-reference/v2.0.0/events#ccipmessagesent
// The receipt and verifier fields complete the ABI, even though only
// encodedMessage is needed to find the recipient.
const CCIPMessageSentV2ABI = parseAbi([
	'event CCIPMessageSent(uint64 indexed destChainSelector,address indexed sender,bytes32 indexed messageId,address feeToken,uint256 tokenAmountBeforeTokenPoolFees,bytes encodedMessage,(address issuer,uint32 destGasLimit,uint32 destBytesOverhead,uint256 feeTokenAmount,bytes extraArgs)[] receipts,bytes[] verifierBlobs)',
]);

const CCIPMessageSentV2Topic = toEventSelector(CCIPMessageSentV2ABI[0]);

/** Returns the EVM recipient for a matching CCIP v2 message, if this log is one. */
export function getCCIPV2Recipient(
	log: Pick<Log, 'topics' | 'data'>,
	targetChain: bigint,
	indexedRecipient: Hex
): Address | undefined {
	if (log.topics[0] !== CCIPMessageSentV2Topic) return undefined;
	if (log.topics[1] === undefined || BigInt(log.topics[1]) !== targetChain) return undefined;

	const { args } = decodeEventLog({ abi: CCIPMessageSentV2ABI, topics: log.topics, data: log.data });
	const message = hexToBytes(args.encodedMessage);

	// MessageV1Codec wire format:
	// https://github.com/smartcontractkit/chainlink-ccip/blob/main/chains/evm/contracts/libraries/MessageV1Codec.sol
	// Version (1), source/destination selectors (8 each), message number (8),
	// gas limits (4 each), finality (4), CCV/executor hash (32).
	if (message.length < 69 || message[0] !== 1) throw new Error('Invalid CCIP v2 MessageV1 header');
	const encodedTargetChain = BigInt(bytesToHex(message.slice(9, 17)));
	if (encodedTargetChain !== targetChain) throw new Error('CCIP v2 destination chain does not match transfer event');

	// Next come length-prefixed onRamp, offRamp and sender addresses, then receiver.
	let offset = 69;
	for (let i = 0; i < 3; i++) {
		const length = message[offset];
		if (length === undefined || offset + 1 + length > message.length) {
			throw new Error('Truncated CCIP v2 MessageV1 address');
		}
		offset += 1 + length;
	}

	const receiverLength = message[offset];
	if (receiverLength === undefined || offset + 1 + receiverLength > message.length) {
		throw new Error('Truncated CCIP v2 MessageV1 receiver');
	}
	if (receiverLength !== 20) return undefined; // The indexed `to` column represents EVM addresses only.

	const recipient = bytesToHex(message.slice(offset + 1, offset + 1 + receiverLength)) as Address;
	const recipientHash = keccak256(encodeAbiParameters([{ type: 'address' }], [recipient]));
	if (recipientHash.toLowerCase() !== indexedRecipient.toLowerCase()) return undefined;
	return recipient;
}
