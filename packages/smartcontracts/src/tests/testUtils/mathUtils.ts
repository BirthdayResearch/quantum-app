import { BigNumber, ethers } from 'ethers';

export function toWei(amount: string): BigNumber {
  return ethers.utils.parseEther(amount);
}

export function amountAfterFee({ amount, transactionFee }: FeeAmountOptions): BigNumber {
  const feeAmount = amount.mul(transactionFee).div(10000);
  const netAmountAfterFee = amount.sub(feeAmount);
  return netAmountAfterFee;
}

// Current time stamp
export function getCurrentTimeStamp({ additionalTime }: GetTimestampOptions = {}): number {
  // Current timestamp in seconds
  if (additionalTime !== undefined) {
    return Math.floor(Date.now() / 1000) + additionalTime;
  }
  return Math.floor(Date.now() / 1000);
}

interface FeeAmountOptions {
  amount: BigNumber;
  transactionFee: BigNumber;
}

interface GetTimestampOptions {
  additionalTime?: number;
}
