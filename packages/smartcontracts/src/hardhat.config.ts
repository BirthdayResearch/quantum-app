import '@nomicfoundation/hardhat-chai-matchers';
import '@nomicfoundation/hardhat-toolbox';
import '@nomiclabs/hardhat-etherscan';

import { HardhatUserConfig, task, types } from 'hardhat/config';

import { TX_AUTOMINE_ENV_VAR, TX_AUTOMINE_INTERVAL_ENV_VAR } from './envvar';

// Default chainId for local testing purposes. Most local testnets (Ganache, etc) use this chainId
export const DEFAULT_CHAINID = 1337;

interface DeployContractArgs {
  name: string;
  deployargs: string | undefined;
  libraries: Record<string, string>;
}

require('dotenv').config({
  path: '.env',
});

task('deployContract', 'Deploys a contract based on the name of the contract')
  .addParam(
    'name',
    'The contract name. If the contract is Foo.sol, the contract name is Foo.',
    // no default value
    undefined,
    types.string,
  )
  .addOptionalParam(
    'deployargs',
    'Comma-delimited contract deployment arguments. If empty, there are no necessary deployment args.',
    // no default value
    undefined,
    types.string,
  )
  .addOptionalParam(
    'libraries',
    'Link a contract to a deployed library. Expects a JSON of library name to address.',
    undefined,
    types.json,
  )
  .setAction(async (taskArgs: DeployContractArgs, hre) => {
    try {
      const { name, deployargs, libraries } = taskArgs;

      const contractFactory = await hre.ethers.getContractFactory(name, {
        libraries,
      });
      const contract = await contractFactory.deploy(...(deployargs === undefined ? [] : deployargs.split(',')));

      // Logs the contract address as the output of this task
      // Can be picked up by the task executor to create a contract instance with the outputted contract address
      console.log(`${contract.address} ${contract.deployTransaction.hash}`);
    } catch (e) {
      // Logs the error message to be picked up by the caller. Errors start with 'Error: ...'
      console.log(e);
    }
  });

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more
const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.8.17',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  gasReporter: {
    currency: 'USD',
    // To enable gas report, set enabled to true
    enabled: false,
    gasPriceApi: process.env.ETHERSCAN_API,
    coinmarketcap: process.env.COINMARKET_API,
  },
  networks: {
    hardhat: {
      // url: 'http://127.0.0.1:8545/',
      chainId: DEFAULT_CHAINID,
      // To enable/disable auto-mining at runtime, refer to:
      // https://hardhat.org/hardhat-network/docs/explanation/mining-modes#using-rpc-methods
      mining: {
        auto: (process.env[TX_AUTOMINE_ENV_VAR] ?? 'true').toLowerCase() === 'true',
        interval: Number(process.env[TX_AUTOMINE_INTERVAL_ENV_VAR] ?? 0),
      },
      // We need to allow large contract sizes since contract sizes
      // could be larger than the stipulated max size in EIP-170
      allowUnlimitedContractSize: true,
    },

    development: {
      url: 'http://127.0.0.1:8545/',
      chainId: DEFAULT_CHAINID,
      // To enable/disable auto-mining at runtime, refer to:
      // https://hardhat.org/hardhat-network/docs/explanation/mining-modes#using-rpc-methods
      mining: {
        auto: (process.env[TX_AUTOMINE_ENV_VAR] ?? 'true').toLowerCase() === 'true',
        interval: Number(process.env[TX_AUTOMINE_INTERVAL_ENV_VAR] ?? 0),
      },
      // We need to allow large contract sizes since contract sizes
      // could be larger than the stipulated max size in EIP-170
      allowUnlimitedContractSize: true,
    },
    sepolia: {
      url: process.env.SEPOLIA_URL || '',
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
    },
    mainnet: {
      url: process.env.MAINNET_URL || '',
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 30000000000, // this is 30 Gwei
      chainId: 1,
    },
  },
  paths: {
    sources: './contracts',
    // tests run in the Hardhat context
    tests: './tests',
    artifacts: './artifacts',
    cache: './cache',
  },
  typechain: {
    outDir: './generated',
    target: 'ethers-v5',
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};

export default config;
