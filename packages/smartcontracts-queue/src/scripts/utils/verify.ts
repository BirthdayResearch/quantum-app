import { run } from 'hardhat';

export async function verify({ contractAddress, args, contract }: ContractInput) {
  console.log('Verifying contract...');
  try {
    await run('verify:verify', {
      address: contractAddress,
      constructorArguments: args,
      contract,
    });
  } catch (e) {
    console.log(e);
  }
}

interface ContractInput {
  contractAddress: string;
  args?: any;
  contract?: string;
}
