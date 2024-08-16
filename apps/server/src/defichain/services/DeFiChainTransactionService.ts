import { DeFiAddress } from '@defichain/jellyfish-address';
import { CTransactionSegWit, Script, TransactionSegWit } from '@defichain/jellyfish-transaction';
import { P2WPKHTransactionBuilder } from '@defichain/jellyfish-transaction-builder';
import { Transaction } from '@defichain/whale-api-client/dist/api/transactions';
import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeFiChainAddressIndex } from '@prisma/client';
import { EnvironmentNetwork, isPlayground } from '@waveshq/walletkit-core';

import { PrismaService } from '../../PrismaService';
import { WhaleApiClientProvider } from '../providers/WhaleApiClientProvider';
import { WhaleWalletProvider } from '../providers/WhaleWalletProvider';
import { WhaleApiService } from './WhaleApiService';

const MAX_TIMEOUT = 300000;
const INTERVAL_TIME = 5000;

@Injectable()
export class DeFiChainTransactionService {
  private network: EnvironmentNetwork;

  constructor(
    private readonly whaleWalletProvider: WhaleWalletProvider,
    private readonly clientProvider: WhaleApiClientProvider,
    private readonly whaleClient: WhaleApiService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.network = configService.getOrThrow<EnvironmentNetwork>(`defichain.network`);
  }

  // Generates a DeFiChain Transaction that will be broadcasted to the chain
  // Accepts a common method getTX so can be reused for all TX types
  async craftTransaction(
    address: string,
    getTX: (from: Script, builder: P2WPKHTransactionBuilder, to: Script) => Promise<TransactionSegWit>,
  ): Promise<CTransactionSegWit> {
    const wallet = this.whaleWalletProvider.getHotWallet();
    const to = DeFiAddress.from(this.clientProvider.remapNetwork(this.network), address).getScript();

    const from = await wallet.getScript();
    const builder = wallet.withTransactionBuilder();
    return new CTransactionSegWit(await getTX(from, builder, to));
  }

  // Broadcast signed transaction to DeFiChain
  async broadcastTransaction(tx: CTransactionSegWit, retries: number = 0): Promise<string> {
    const client = this.whaleClient.getClient();
    try {
      return await client.rawtx.send({ hex: tx.toHex() });
    } catch (e) {
      // Known issue on DeFiChain, need to add retry on broadcast
      if (retries < 3) {
        return await this.broadcastTransaction(tx, retries + 1);
      }
      throw e;
    }
  }

  // Check if the transaction has been confirmed
  async getTxn(id: string): Promise<{ blockHeight: string; blockHash: string; numberOfConfirmations: number }> {
    const client = this.whaleClient.getClient();
    let txn = {
      blockHeight: '',
      blockHash: '',
      numberOfConfirmations: 0,
    };

    try {
      const stats = await client.stats.get();
      const txnData = await client.transactions.get(id);
      txn = {
        blockHeight: txnData.block.height.toString(),
        blockHash: txnData.block.hash,
        numberOfConfirmations: stats.count.blocks - txnData.block.height,
      };
    } catch (err) {
      return txn;
    }

    return txn;
  }

  // Check if the transaction has been confirmed
  async waitForTxConfirmation(id: string): Promise<Transaction> {
    const client = this.whaleClient.getClient();
    const initialTime = isPlayground(this.network) ? 5000 : 30000;
    let start = initialTime;

    return new Promise((resolve, reject) => {
      let intervalID: NodeJS.Timeout;
      const callTransaction = (): void => {
        client.transactions
          .get(id)
          .then((tx) => {
            if (intervalID !== undefined) {
              clearInterval(intervalID);
            }
            resolve(tx);
          })
          .catch((e) => {
            if (start >= MAX_TIMEOUT) {
              if (intervalID !== undefined) {
                clearInterval(intervalID);
              }
              reject(e);
            }
          });
      };
      setTimeout(() => {
        callTransaction();
        intervalID = setInterval(() => {
          start += INTERVAL_TIME;
          callTransaction();
        }, INTERVAL_TIME);
      }, initialTime);
    });
  }

  // this function is expected to be called only by endpoint /defichain/transactions?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD
  async getTransactions(dateFrom: Date, dateTo: Date, today: Date): Promise<Omit<DeFiChainAddressIndex, 'id'>[]> {
    try {
      if (dateFrom > today || dateTo > today) {
        throw new BadRequestException(`Cannot query future date`);
      }

      if (dateFrom > dateTo) {
        throw new BadRequestException(`fromDate cannot be more recent than toDate`);
      }

      // dateTo less than or equal to 23:59:59:999 is equivalent to
      // dateTo less than (dateTo + 1)
      dateTo.setDate(dateTo.getDate() + 1);
      const fullResult = await this.prisma.deFiChainAddressIndex.findMany({
        where: {
          createdAt: {
            gte: dateFrom.toISOString(),
            lt: dateTo.toISOString(),
          },
        },
      });

      return fullResult.map((transaction) => {
        const { id, ...modifyTransaction } = transaction;
        return modifyTransaction;
      });
    } catch (e: any) {
      throw new HttpException(
        {
          statusCode: e.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          error: `API call for DeFiChain transactions was unsuccessful`,
          message: e.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
        {
          cause: e,
        },
      );
    }
  }
}
