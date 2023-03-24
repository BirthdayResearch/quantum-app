import { ethers } from 'hardhat';

import { TimelockController } from '../generated';
import { verify } from './utils/verify';

export async function deployTimelockController({
  minDelay,
  proposers,
  executors,
  admin,
}: InputsForInitialization): Promise<TimelockController> {
  const timelockControllerFactory = await ethers.getContractFactory('TimelockController');
  const timelockController = await timelockControllerFactory.deploy(minDelay, proposers, executors, admin);
  await timelockController.deployed();
  console.log('Timelock Controller Address: ', timelockController.address);
  console.log('Verifying...');
  await verify({ contractAddress: timelockController.address, args: [minDelay, proposers, executors, admin] });

  return timelockController;
}

interface InputsForInitialization {
  minDelay: ethers.BigNumber;
  proposers: string[];
  executors: string[];
  admin: string;
}
