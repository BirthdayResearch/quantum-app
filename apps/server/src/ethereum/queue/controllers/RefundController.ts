import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { EthereumTransactionValidationPipe } from '../../../pipes/EthereumTransactionValidation.pipe';
import { RefundService } from '../services/RefundService';

@Controller()
export class RefundController {
  constructor(private readonly refundService: RefundService) {}

  /**
   * Return queue with status updated to QueueStatus.REFUND_REQUESTED
   *
   * @body {transactionHash} transactionHash unique Ethereum transaction hash that is created when a transaction is done from EVM -> DFC
   */
  @Throttle(5, 60)
  @Post('refund')
  async requestRefundQueue(@Body('transactionHash', new EthereumTransactionValidationPipe()) transactionHash: string) {
    return this.refundService.requestQueueRefund(transactionHash);
  }
}
