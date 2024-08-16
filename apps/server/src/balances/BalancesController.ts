import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

import { Balances } from './BalancesInterface';
import { BalancesService } from './BalancesService';

@Controller('balances')
export class BalancesController {
  constructor(private readonly balancesService: BalancesService) {}

  @SkipThrottle()
  @Get()
  async getBalances(): Promise<Balances> {
    return this.balancesService.getBalances();
  }
}
