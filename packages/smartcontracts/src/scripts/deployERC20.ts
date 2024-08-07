import { ethers, network } from 'hardhat';

import { TestToken } from '../generated';

// npx hardhat run --network sepolia ./scripts/deployERC20.ts
export async function tokenDeployment(): Promise<TestTokens> {
  const { chainId } = network.config;
  const ERC20 = await ethers.getContractFactory('TestToken');
  const mockTokenUSDT = await ERC20.deploy('MockUSDT', 'MUSDT'); // use {nonce:} if tx stuck
  await mockTokenUSDT.deployed();
  console.log('Test MUSDT token is deployed to ', mockTokenUSDT.address);
  if (chainId !== 1337) {
    console.log(
      `To verify on Etherscan: npx hardhat verify --network sepolia --contract contracts/TestToken.sol:TestToken ${mockTokenUSDT.address} MockUSDT MUSDT`,
    );
  }
  const mockTokenUSDC = await ERC20.deploy('MockUSDC', 'MUSDC');
  await mockTokenUSDC.deployed();
  console.log('Test MUSDC token is deployed to ', mockTokenUSDC.address);
  if (chainId !== 1337) {
    console.log(
      `To verify on Etherscan: npx hardhat verify --network sepolia --contract contracts/TestToken.sol:TestToken ${mockTokenUSDC.address} MockUSDC MUSDC`,
    );
  }
  return { usdtContract: mockTokenUSDT, usdcContract: mockTokenUSDC };
}

interface TestTokens {
  usdtContract: TestToken;
  usdcContract: TestToken;
}
