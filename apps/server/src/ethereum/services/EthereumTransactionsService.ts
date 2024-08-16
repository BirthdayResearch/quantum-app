import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';

import { SupportedEVMTokenSymbols } from '../../AppConfig';
import { PrismaService } from '../../PrismaService';
import { TransactionsDto } from '../EthereumInterface';

@Injectable()
export class EthereumTransactionsService {
  constructor(private prisma: PrismaService) {}

  async getTransactions(dateFrom: Date, dateTo: Date, today: Date): Promise<TransactionsDto[]> {
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

      const transactions = await this.prisma.bridgeEventTransactions.findMany({
        where: {
          createdAt: {
            gte: dateFrom.toISOString(),
            lt: dateTo.toISOString(),
          },
        },
      });

      return transactions.map(
        (t) =>
          new TransactionsDto(
            t.transactionHash,
            t.tokenSymbol as SupportedEVMTokenSymbols,
            t.blockHash,
            t.blockHeight,
            t.amount ?? '',
            t.createdAt.toISOString(),
            t.status,
            t.sendTransactionHash,
            t.unconfirmedSendTransactionHash,
          ),
      );
    } catch (e: any) {
      throw new HttpException(
        {
          statusCode: e.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          error: `API call for Ethereum transactions was unsuccessful`,
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
