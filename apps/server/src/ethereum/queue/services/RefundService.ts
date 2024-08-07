import { BadRequestException, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueueStatus } from '@prisma/client';
import { ethers } from 'ethers';

import { ETHERS_RPC_PROVIDER } from '../../../modules/EthersModule';
import { PrismaService } from '../../../PrismaService';
import { ContractType, ErrorMsgTypes, VerificationService } from '../../services/VerificationService';

@Injectable()
export class RefundService {
  private readonly contractAddress: string;

  constructor(
    @Inject(ETHERS_RPC_PROVIDER) readonly ethersRpcProvider: ethers.providers.StaticJsonRpcProvider,
    private verificationService: VerificationService,
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.contractAddress = this.configService.getOrThrow('ethereum.contracts.queueBridgeProxy.address');
  }

  async requestQueueRefund(transactionHash: string) {
    try {
      const queue = await this.prisma.ethereumQueue.findFirst({
        where: {
          transactionHash,
        },
      });

      // Check if queue exists
      if (!queue) {
        throw new BadRequestException(ErrorMsgTypes.QueueNotFound);
      }

      const allowedRefundRequests: QueueStatus[] = [QueueStatus.EXPIRED, QueueStatus.ERROR, QueueStatus.IN_PROGRESS];
      // check if Queue is NOT in `IN_PROGRESS`, `ERROR` or `EXPIRED` status
      if (!allowedRefundRequests.includes(queue.status)) {
        throw new BadRequestException('Unable to request refund for queue');
      }

      // check if Queue has expired
      const currentDate = new Date();
      if (currentDate.getTime() < queue.expiryDate.getTime()) {
        throw new BadRequestException(
          'Refund requests for the queue cannot be made at the moment as it has been less than 72 hours since the queue was created.',
        );
      }
      await this.verificationService.verifyIfValidTxn(transactionHash, this.contractAddress, ContractType.queue);

      // update queue if queue exist and refund is valid
      const queueWithUpdatedStatus = await this.prisma.ethereumQueue.update({
        where: { transactionHash },
        data: { status: QueueStatus.REFUND_REQUESTED },
      });

      return {
        id: String(queueWithUpdatedStatus.id),
        transactionHash: queueWithUpdatedStatus.transactionHash,
        status: queueWithUpdatedStatus.status,
      };
    } catch (e: any) {
      throw new HttpException(
        {
          status: e.status ?? (e.code || HttpStatus.INTERNAL_SERVER_ERROR),
          error: `API call for refund was unsuccessful: ${e.message}`,
        },
        e.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
        {
          cause: e,
        },
      );
    }
  }
}
