/**
 * Hardhat closely follows the Ethereum RPC spec, which does not allow leading zeroes for hex strings
 * @see https://ethereum.org/en/developers/docs/apis/json-rpc/#quantities-encoding
 */
import { BigNumber, BigNumberish, ethers } from 'ethers';

export function toZeroStrippedHex(number: BigNumberish): string {
  return ethers.utils.hexStripZeros(BigNumber.from(number).toHexString());
}
