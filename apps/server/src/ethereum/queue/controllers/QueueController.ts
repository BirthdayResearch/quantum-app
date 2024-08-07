import { Body, Controller, Get, Param, Post, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { QueueStatus } from '@prisma/client';

import { ApiPagedResponse } from '../../../pagination/ApiPagedResponse';
import { PaginationQuery } from '../../../pagination/ApiQuery';
import { EnumValidationPipe } from '../../../pipes/EnumValidation.pipe';
import { EthereumQueueMultiStatusPipe } from '../../../pipes/EthereumQueueStatus.pipe';
import { EthereumTransactionValidationPipe } from '../../../pipes/EthereumTransactionValidation.pipe';
import { OrderBy, Queue } from '../model/Queue';
import { QueueService } from '../services/QueueService';

@Controller()
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  /**
   * Get information about a queue with given transactionHash.
   *
   * @param {string} transactionHash transactionHash
   * @param {QueueStatus} [status=QueueStatus] status of queue
   * @returns {Promise<Queue>}
   */
  @Get(':transactionHash')
  @Throttle(5, 60)
  async getQueue(
    @Param('transactionHash', new EthereumTransactionValidationPipe()) transactionHash: string,
    @Query('status', new EnumValidationPipe(QueueStatus))
    status?: QueueStatus,
  ): Promise<Queue> {
    return this.queueService.getQueue(transactionHash, status);
  }

  /**
   * Return paginated queue list.
   *
   * @param {QueueStatus[]} status accepts multiple status filters split by ',' eg: status=QueueStatus.IN_PROGRESS,QueueStatus.COMPLETED
   * @param {PaginationQuery} query pagination query
   * @param {OrderBy} [orderBy=OrderBy.ASC] default value of list orderBy is ASC
   * @returns {Promise<ApiPagedResponse<Queue> | []>}
   */
  @Get('list')
  @Throttle(20, 60)
  @UsePipes(new ValidationPipe({ skipMissingProperties: true })) // this is required for validating and transforming the incoming request data based on the validation decorators for Pagination Query
  async listQueue(
    @Query('status', new EthereumQueueMultiStatusPipe(QueueStatus)) status: QueueStatus[],
    @Query() query?: PaginationQuery,
    @Query('orderBy', new EnumValidationPipe(OrderBy, OrderBy.ASC))
    orderBy?: OrderBy,
  ): Promise<ApiPagedResponse<Queue>> {
    return this.queueService.listQueue(query, orderBy, status);
  }

  /**
   * Create a queue transaction with given transactionHash.
   *
   * @Body {string} transactionHash transactionHash
   * @returns {Promise<EthereumQueue>}
   */
  @Post()
  @Throttle(10, 60)
  queue(@Body('transactionHash', new EthereumTransactionValidationPipe()) transactionHash: string) {
    return this.queueService.createQueueTransaction(transactionHash);
  }

  /**
   * Verify a queue transaction with given transactionHash.
   *
   * @Body {string} transactionHash transactionHash
   * @returns {Promise<VerifyQueueTransactionDto>}
   */
  @Post('verify')
  @Throttle(35, 60)
  verify(@Body('transactionHash', new EthereumTransactionValidationPipe()) transactionHash: string) {
    return this.queueService.verify(transactionHash);
  }

  /**
   * Verify a queue transaction with given transactionHash and update the defichainStatus.
   *
   * @Body {string} transactionHash transactionHash
   * @returns {Promise<VerifyQueueTransactionDto>}
   */
  @Post('/verifyDefichain')
  @Throttle(35, 60)
  defichainVerify(@Body('transactionHash') transactionHash: string) {
    return this.queueService.defichainVerify(transactionHash);
  }
}
