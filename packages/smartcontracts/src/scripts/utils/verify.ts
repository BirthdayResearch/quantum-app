import { run } from 'hardhat';

export async function verify({ contractAddress, args }: ContractInput) {
  console.log('Verifying contract...');
  try {
    await run('verify:verify', {
      address: contractAddress,
      constructorArguments: args,
    });
  } catch (e) {
    if ((e as Error).message.toLowerCase().includes('already verified')) {
      console.log('Already verified!');
    } else {
      console.log(e);
    }
  }
}

interface ContractInput {
  contractAddress: string;
  args?: any;
}
