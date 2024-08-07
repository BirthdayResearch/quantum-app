import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ethers } from 'ethers';

@Injectable()
export class EthereumAddressValidationPipe implements PipeTransform<string> {
  async transform(address: string) {
    if (ethers.utils.isAddress(address)) {
      return address;
    }
    throw new BadRequestException(`Invalid Ethereum address: ${address}`);
  }
}
