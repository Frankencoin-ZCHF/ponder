import { Address } from 'viem';

/**
 * Normalizes an address to lowercase format.
 * This utility ensures consistent address handling across the codebase.
 *
 * @param addr - The address string to normalize
 * @returns The normalized address in lowercase
 */
export function normalizeAddress(addr: string): Address {
	return addr.toLowerCase() as Address;
}
