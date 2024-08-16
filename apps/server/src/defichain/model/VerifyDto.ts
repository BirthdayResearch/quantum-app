import BigNumber from 'bignumber.js';
import { IsEnum, IsNumberString, IsString } from 'class-validator';

export enum TokenSymbol {
  'BTC' = 'BTC',
  'USDT' = 'USDT',
  'USDC' = 'USDC',
  'ETH' = 'ETH',
  'EUROC' = 'EUROC',
  'DFI' = 'DFI',
  'MATIC' = 'MATIC',
  'XCHF' = 'XCHF',
}

export class VerifyObject {
  constructor(
    public readonly amount: BigNumber,
    public readonly address: string,
    public readonly ethReceiverAddress: string,
    public readonly tokenAddress: string,
    public readonly symbol: TokenSymbol,
  ) {
    this.address = address;
    this.ethReceiverAddress = ethReceiverAddress;
    this.tokenAddress = tokenAddress;
    this.amount = amount;
    this.symbol = symbol;
  }
}

export class VerifyDto {
  @IsNumberString()
  amount: string;

  @IsString()
  address: string;

  @IsString()
  ethReceiverAddress: string;

  @IsString()
  tokenAddress: string;

  @IsEnum(TokenSymbol)
  symbol: TokenSymbol;

  constructor(address: string, ethReceiverAddress: string, tokenAddress: string, amount: string, symbol: TokenSymbol) {
    this.address = address;
    this.ethReceiverAddress = ethReceiverAddress;
    this.tokenAddress = tokenAddress;
    this.amount = amount;
    this.symbol = symbol;
  }

  toObj(): VerifyObject {
    return new VerifyObject(
      new BigNumber(this.amount),
      this.address,
      this.ethReceiverAddress,
      this.tokenAddress,
      this.symbol,
    );
  }
}
