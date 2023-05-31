import { ethers } from 'hardhat';

import { TestToken } from '../generated';
import { verify } from './utils/verify';

export async function deployTestERC20({ name, symbol }: InputsForConstructor): Promise<TestToken> {
  const ERC20Factory = await ethers.getContractFactory('TestToken');
  const ERC20 = await ERC20Factory.deploy(name, symbol);
  await ERC20.deployTransaction.wait(6);
  await verify({ contractAddress: ERC20.address, args: [name, symbol] });
  return ERC20;
}

interface InputsForConstructor {
  name: string;
  symbol: string;
}
