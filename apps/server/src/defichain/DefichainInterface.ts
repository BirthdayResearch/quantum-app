import { IsDateString, IsOptional } from 'class-validator';

import { SupportedDFCTokenSymbols } from '../AppConfig';
import { Iso8601DateOnlyString } from '../utils/StatsUtils';

export class DeFiChainStats {
  readonly totalTransactions: number;

  readonly confirmedTransactions: number;

  readonly amountBridged: BridgedDfcToEvm;

  readonly totalBridgedAmount: BridgedDfcToEvm;

  constructor(
    totalTransactions: number,
    confirmedTransactions: number,
    amountBridged: BridgedDfcToEvm,
    totalBridgedAmount: BridgedDfcToEvm,
  ) {
    this.totalTransactions = totalTransactions;
    this.confirmedTransactions = confirmedTransactions;
    this.amountBridged = amountBridged;
    this.totalBridgedAmount = totalBridgedAmount;
  }
}

export type BridgedDfcToEvm = Record<SupportedDFCTokenSymbols, string>;

export class DFCStatsDto {
  @IsDateString()
  @IsOptional()
  date?: Iso8601DateOnlyString;
}

export type BridgedDFCTokenSum = {
  tokenSymbol: SupportedDFCTokenSymbols;
  totalAmount: string;
};

export class TransactionsQueryDto {
  @IsDateString()
  fromDate!: Iso8601DateOnlyString;

  @IsDateString()
  toDate!: Iso8601DateOnlyString;
}
