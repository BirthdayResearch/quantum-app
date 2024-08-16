import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class EthereumTransactionValidationPipe implements PipeTransform<string> {
  async transform(transactionHash: string) {
    const regex = /^0x([A-Fa-f0-9]{64})$/;
    const isTransactionHash = regex.test(transactionHash);
    if (isTransactionHash === false) {
      throw new BadRequestException(`Invalid Ethereum transaction hash: ${transactionHash}`);
    }
    return transactionHash;
  }
}
