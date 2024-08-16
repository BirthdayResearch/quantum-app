import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import BigNumber from 'bignumber.js';

import { SupportedDFCTokenSymbols } from '../../AppConfig';
import { PrismaService } from '../../PrismaService';
import { initializeEnumKeys } from '../../utils/EnumUtils';
import { BridgedDfcToEvm, BridgedDFCTokenSum, DeFiChainStats, DFCStatsDto } from '../DefichainInterface';

@Injectable()
export class DeFiChainStatsService {
  private readonly NUMERICAL_PLACEHOLDER = '0.000000';

  constructor(private prisma: PrismaService) {}

  async getDefiChainStats(date?: DFCStatsDto): Promise<DeFiChainStats> {
    try {
      const dateOnly = date ?? new Date().toISOString().slice(0, 10);
      const dateFrom = new Date(dateOnly as string);
      const today = new Date();
      if (dateFrom > today) {
        throw new BadRequestException(`Cannot query future date.`);
      }
      dateFrom.setUTCHours(0, 0, 0, 0); // set to UTC +0
      const dateTo = new Date(dateFrom);
      dateTo.setDate(dateFrom.getDate() + 1);

      const [totalTransactions, confirmedTransactions] = await Promise.all([
        this.prisma.deFiChainAddressIndex.count({
          where: {
            createdAt: {
              //   new Date() creates date with current time and day and etc.
              gte: dateFrom.toISOString(),
              lt: dateTo.toISOString(),
            },
          },
        }),

        this.prisma.deFiChainAddressIndex.findMany({
          where: {
            claimSignature: { not: null },
            address: { not: undefined },
            tokenSymbol: { not: null },
            claimAmount: { not: null },
            createdAt: {
              // new Date() creates date with current time and day and etc.
              gte: dateFrom.toISOString(),
              lt: dateTo.toISOString(),
            },
          },
          select: {
            tokenSymbol: true,
            claimAmount: true,
          },
        }),
      ]);

      const amountBridged = this.getAmountBridged(confirmedTransactions);

      // Get overall total amount of tokens claimed
      const totalBridgedAmount = initializeEnumKeys(SupportedDFCTokenSymbols, this.NUMERICAL_PLACEHOLDER);
      const totalAmounts: BridgedDFCTokenSum[] = await this.prisma.$queryRaw(
        Prisma.sql`
        SELECT SUM("claimAmount"::DECIMAL) AS "totalAmount", "tokenSymbol"
        FROM "DeFiChainAddressIndex" WHERE "claimAmount" IS NOT NULL GROUP BY "tokenSymbol";`,
      );
      for (const total of totalAmounts) {
        totalBridgedAmount[total.tokenSymbol as SupportedDFCTokenSymbols] = BigNumber(total.totalAmount)
          .decimalPlaces(6, BigNumber.ROUND_FLOOR)
          .toFixed(6);
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
          error: `API call for DefiChain statistics was unsuccessful: ${e.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
        {
          cause: e,
        },
      );
    }
  }

  getAmountBridged(
    confirmedTransactions: Array<{
      tokenSymbol: string | null;
      claimAmount: string | null;
    }>,
  ): BridgedDfcToEvm {
    const amountBridgedBigN = initializeEnumKeys(SupportedDFCTokenSymbols, BigNumber(0));
    for (const transaction of confirmedTransactions) {
      const { tokenSymbol, claimAmount } = transaction;
      amountBridgedBigN[tokenSymbol as SupportedDFCTokenSymbols] = amountBridgedBigN[
        tokenSymbol as SupportedDFCTokenSymbols
      ].plus(BigNumber(claimAmount as string));
    }
    const amountBridgedToEVM = initializeEnumKeys(SupportedDFCTokenSymbols, this.NUMERICAL_PLACEHOLDER);

    Object.keys(amountBridgedBigN).forEach((key) => {
      amountBridgedToEVM[key as SupportedDFCTokenSymbols] = amountBridgedBigN[key as SupportedDFCTokenSymbols]
        .decimalPlaces(6, BigNumber.ROUND_FLOOR)
        .toFixed(6);
    });

    return amountBridgedToEVM;
  }
}
