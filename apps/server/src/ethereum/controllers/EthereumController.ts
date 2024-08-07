import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import BigNumber from 'bignumber.js';

import { SupportedEVMTokenSymbols } from '../../AppConfig';
import { SemaphoreCache } from '../../libs/caches/SemaphoreCache';
import { EthereumTransactionValidationPipe } from '../../pipes/EthereumTransactionValidation.pipe';
import { EVMTransactionConfirmerService, HandledEVMTransaction } from '../services/EVMTransactionConfirmerService';

@Controller()
export class EthereumController {
  constructor(
    private readonly evmTransactionConfirmerService: EVMTransactionConfirmerService,
    protected readonly cache: SemaphoreCache,
  ) {}

  @SkipThrottle()
  @Get('balance/:tokenSymbol')
  async getBalance(@Param('tokenSymbol') tokenSymbol: SupportedEVMTokenSymbols): Promise<string> {
    return this.evmTransactionConfirmerService.getBalance(tokenSymbol);
  }

  @Post('handleTransaction')
  @Throttle(35, 60)
  async handleTransaction(
    @Body('transactionHash', new EthereumTransactionValidationPipe()) transactionHash: string,
  ): Promise<HandledEVMTransaction> {
    return this.evmTransactionConfirmerService.handleTransaction(transactionHash);
  }

  @Post('allocateDFCFund')
  @Throttle(35, 60)
  async allocateDFCFund(
    @Body('transactionHash', new EthereumTransactionValidationPipe()) transactionHash: string,
  ): Promise<{ transactionHash: string; isConfirmed: boolean; numberOfConfirmationsDfc: number }> {
    return this.evmTransactionConfirmerService.allocateDFCFund(transactionHash);
  }

  @Get('transactionDetails')
  @Throttle(35, 60)
  async getEVMTxnDetails(
    @Query('transactionHash', new EthereumTransactionValidationPipe()) transactionHash: string,
  ): Promise<{ id: string; symbol: string; amount: BigNumber; toAddress: string }> {
    return this.evmTransactionConfirmerService.getTransactionDetails(transactionHash);
  }
}
