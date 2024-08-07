import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import BigNumber from 'bignumber.js';

import { SupportedEVMTokenSymbols } from '../../AppConfig';
import { TokenSymbol } from '../../defichain/model/VerifyDto';
import { PrismaService } from '../../PrismaService';
import { initializeEnumKeys } from '../../utils/EnumUtils';
import { BridgedEVMTokenSum, StatsDto, StatsQueryDto } from '../EthereumInterface';

@Injectable()
export class EthereumStatsService {
  private readonly NUMERICAL_PLACEHOLDER = '0.000000';

  constructor(private prisma: PrismaService) {}

  async getStats(date?: StatsQueryDto): Promise<StatsDto> {
    try {
      // Use today's date if no param is given
      // Note: Remove the timestamp to prevent 24-hour rolling window
      const dateOnly = date ?? new Date().toISOString().slice(0, 10);
      const dateFrom = new Date(dateOnly as string);
      const today = new Date();

      if (dateFrom > today) {
        throw new BadRequestException(`Cannot query future date`);
      }

      dateFrom.setUTCHours(0, 0, 0, 0); // set to UTC +0
      const dateTo = new Date(dateFrom);
      dateTo.setDate(dateFrom.getDate() + 1);

      // Concurrently query both count and confirmed txns
      const [totalTransactions, confirmedTransactions] = await Promise.all([
        this.prisma.bridgeEventTransactions.count({
          where: {
            createdAt: {
              gte: dateFrom.toISOString(),
              lt: dateTo.toISOString(),
            },
          },
        }),

        // Get only confirmed transactions
        this.prisma.bridgeEventTransactions.findMany({
          where: {
            status: 'CONFIRMED',
            tokenSymbol: { not: null },
            amount: { not: null },
            sendTransactionHash: { not: null },
            createdAt: {
              gte: dateFrom.toISOString(),
              lt: dateTo.toISOString(),
            },
          },
        }),
      ]);

      // First, sum each token with BigNumber for accuracy
      const amountBridgedBigN = initializeEnumKeys(SupportedEVMTokenSymbols, BigNumber(0));

      for (const transaction of confirmedTransactions) {
        let { tokenSymbol } = transaction;
        if (tokenSymbol === TokenSymbol.BTC) {
          tokenSymbol = SupportedEVMTokenSymbols.WBTC;
        }
        if (tokenSymbol && tokenSymbol in SupportedEVMTokenSymbols) {
          amountBridgedBigN[tokenSymbol as SupportedEVMTokenSymbols] = amountBridgedBigN[
            tokenSymbol as SupportedEVMTokenSymbols
          ].plus(BigNumber(transaction.amount as string));
        }
      }

      // Then, convert to string in preparation for response payload
      const amountBridged = initializeEnumKeys(SupportedEVMTokenSymbols, this.NUMERICAL_PLACEHOLDER);

      Object.keys(amountBridged).forEach((token) => {
        amountBridged[token as SupportedEVMTokenSymbols] = amountBridgedBigN[token as SupportedEVMTokenSymbols]
          .decimalPlaces(6, BigNumber.ROUND_FLOOR)
          .toFixed(6);
      });

      // Get overall total amount of tokens bridged
      const totalBridgedAmount = initializeEnumKeys(SupportedEVMTokenSymbols, this.NUMERICAL_PLACEHOLDER);
      const totalAmounts: BridgedEVMTokenSum[] = await this.prisma.$queryRaw(
        Prisma.sql`
        SELECT SUM(amount::DECIMAL) AS "totalAmount", "tokenSymbol" 
        FROM "BridgeEventTransactions" WHERE amount IS NOT NULL GROUP BY "tokenSymbol";`,
      );
      for (const total of totalAmounts) {
        let { tokenSymbol } = total;
        if ((tokenSymbol as string) === TokenSymbol.BTC) {
          tokenSymbol = SupportedEVMTokenSymbols.WBTC;
        }
        if (tokenSymbol && tokenSymbol in SupportedEVMTokenSymbols) {
          totalBridgedAmount[tokenSymbol as SupportedEVMTokenSymbols] = BigNumber(total.totalAmount)
            .decimalPlaces(6, BigNumber.ROUND_FLOOR)
            .toFixed(6);
        }
      }

      return {
        totalTransactions,
        confirmedTransactions: confirmedTransactions.length,
        amountBridged,
        totalBridgedAmount,
      };
    } catch (e: any) {
      throw new HttpException(
        {
          status: e.code || HttpStatus.INTERNAL_SERVER_ERROR,
          error: `API call for Ethereum statistics was unsuccessful: ${e.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
        {
          cause: e,
        },
      );
    }
  }
}
