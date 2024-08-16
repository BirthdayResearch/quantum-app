import { Injectable, Logger } from '@nestjs/common';

import { SupportedDFCTokenSymbols, SupportedEVMTokenSymbols } from '../AppConfig';
import { WhaleWalletService } from '../defichain/services/WhaleWalletService';
import { EVMTransactionConfirmerService } from '../ethereum/services/EVMTransactionConfirmerService';
import { Balances, NetworkBalances } from './BalancesInterface';

@Injectable()
export class BalancesService {
  private readonly logger: Logger;

  constructor(
    private readonly evmTransactionConfirmerService: EVMTransactionConfirmerService,
    private readonly whaleWalletService: WhaleWalletService,
  ) {
    this.logger = new Logger(BalancesService.name);
  }

  async getBalances(): Promise<Balances> {
    let EVMBalances: NetworkBalances = <NetworkBalances>{};
    let DFCBalances: NetworkBalances = <NetworkBalances>{};
    const promises: Array<Promise<void>> = [];

    // Iterate over each `SupportedEVMTokenSymbols` and get balance for each EVM Tokens
    Object.values(SupportedEVMTokenSymbols).forEach((token) => {
      const eachTokenVal = this.evmTransactionConfirmerService
        .getBalance(token)
        .then((tokenBalance) => {
          EVMBalances = {
            ...EVMBalances,
            [token]: tokenBalance,
          };
        })
        .catch((e) => {
          this.logger.error(`[getBalances] get evm balance error for token ${token}`, e);
          EVMBalances = {
            ...EVMBalances,
            [token]: 'error',
          };
        });
      promises.push(eachTokenVal);
    });

    // Iterate over each `SupportedDFCTokenSymbols` and get balance for each DFI Tokens
    Object.values(SupportedDFCTokenSymbols).forEach((token) => {
      const eachTokenVal = this.whaleWalletService
        .getBalance(token)
        .then((tokenBalance) => {
          DFCBalances = {
            ...DFCBalances,
            [token]: tokenBalance,
          };
        })
        .catch((e) => {
          this.logger.error(`[getBalances] get dfi balance error for token ${token}`, e);
          DFCBalances = {
            ...DFCBalances,
            [token]: 'error',
          };
        });
      promises.push(eachTokenVal);
    });

    await Promise.all(promises);
    return {
      EVM: EVMBalances,
      DFC: DFCBalances,
    };
  }
}
