import { BigNumber } from 'ethers';
import { ethers } from 'hardhat';

import { TestToken__factory } from '../generated';

require('dotenv').config({
  path: './.env',
});

// This script will mint and approve the Bridge address to spend tokens on behalf on the user, given user has provided their PRIVATE_KEY in .env. See .env.example for the reference.
// This is purely a convenience function so that users will not need to create a separate approval tx
// 100,000 tokens will be minted. `amount` can be changed. To run this script, run the below command in smartContract directory.
// npx hardhat run --network goerli ./scripts/goerliMintApprove.ts
async function main() {
  // Minting 100,000 tokens.
  const amount = ethers.utils.parseEther('100000');

  // [usdtAddress, usdcAddress, mwbtcAddress, eurocAddress, dfiAddress]
  const tokenAddresses = [
    '0xB200af2b733B831Fbb3d98b13076BC33F605aD58',
    '0xA218A0EA9a888e3f6E2dfFdf4066885f596F07bF',
    '0xD723D679d1A3b23d0Aafe4C0812f61DDA84fc043',
    '0x5ea4bbB3204522f3Ac65137D1E12027D9848231A',
    '0xe5442CC9BA0FF56E4E2Edae51129bF3A1b45d673',
  ];

  for (let i = 0; i < tokenAddresses.length; i += 1) {
    await mintAndApproveTestTokens(tokenAddresses[i], amount);
  }
}

async function mintAndApproveTestTokens(tokenAddress: string, amount: BigNumber) {
  const bridgeAddress = '0x96E5E1d6377ffA08B9c08B066f430e33e3c4C9ef';
  const provider = new ethers.providers.JsonRpcProvider(process.env.GOERLI_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const tokenContract = new ethers.Contract(tokenAddress, TestToken__factory.createInterface(), wallet);
  const mintTx = await tokenContract.mint(wallet.address, amount);
  await mintTx.wait();
  console.log('Mint tx hash', await tokenContract.name(), ': ', mintTx.hash);
  const remainingAllowance = await tokenContract.allowance(wallet.address, bridgeAddress);
  if (remainingAllowance === 0) {
    const approveTx = await tokenContract.approve(bridgeAddress, ethers.constants.MaxUint256);
    await approveTx.wait();
    console.log('Approve tx hash', await tokenContract.name(), ': ', approveTx.hash);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
