import { TransactionSegWit } from '@defichain/jellyfish-transaction';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import BigNumber from 'bignumber.js';

import { WhaleWalletProvider } from '../providers/WhaleWalletProvider';
import { DeFiChainTransactionService } from './DeFiChainTransactionService';

@Injectable()
export class SendService {
  private readonly logger: Logger;

  constructor(
    private readonly transactionService: DeFiChainTransactionService,
    private readonly whaleWalletProvider: WhaleWalletProvider,
  ) {
    this.logger = new Logger(SendService.name);
  }

  async send(address: string, token: { symbol: string; id: string; amount: BigNumber }): Promise<string> {
    const signedTX = await this.transactionService.craftTransaction(address, async (from, builder, to) => {
      let signed: TransactionSegWit;
      // To be able to send UTXO DFI
      if (token.symbol === 'DFI') {
        await this.verifyDFIBalance(token.amount);
        signed = await builder.utxo.send(token.amount, to, from);
      } else {
        // Rest of dTokens to use this tx type
        signed = await builder.account.accountToAccount(
          {
            from,
            to: [
              {
                script: to,
                balances: [
                  {
                    token: +token.id,
                    amount: token.amount,
                  },
                ],
              },
            ],
          },
          from,
        );
      }
      return signed;
    });
    return this.transactionService.broadcastTransaction(signedTX, 0);
  }

  private async verifyDFIBalance(amountToSend: BigNumber): Promise<void> {
    const balance = await this.whaleWalletProvider.getHotWalletBalance();
    const DFIBalance = BigNumber.max(0, new BigNumber(balance).minus(amountToSend));
    if (DFIBalance.isLessThanOrEqualTo(0) || DFIBalance.isNaN()) {
      this.logger.log(`[Sending UTXO] Failed to send because insufficient DFI UTXO in hot wallet`);
      throw new BadRequestException('Insufficient DFI liquidity');
    }
  }
}
