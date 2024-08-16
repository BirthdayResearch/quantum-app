import * as child_process from 'node:child_process';

import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StartedPostgreSqlContainer } from '@stickyjs/testcontainers';
import { EnvironmentNetwork } from '@waveshq/walletkit-core';
import { StartedHardhatNetworkContainer } from 'smartcontracts';
import { StartedHardhatNetworkContainer as StartedHardhatNetworkQueueContainer } from 'smartcontracts-queue';

import { AppConfig, DeepPartial } from '../../src/AppConfig';
import { AppModule } from '../../src/AppModule';

@Module({})
export class TestingModule {
  static register(config: AppConfig): DynamicModule {
    return {
      module: TestingModule,
      imports: [AppModule, ConfigModule.forFeature(() => config)],
    };
  }
}

export function buildTestConfig({
  startedHardhatContainer,
  testnet,
  defichain,
  ethereum,
  startedPostgresContainer,
  usdcAddress,
  usdtAddress,
  wbtcAddress,
  eurocAddress,
  maticAddress,
  dfiAddress,
}: BuildTestConfigParams) {
  if (startedPostgresContainer === undefined) {
    throw Error('Must pass in StartedPostgresContainer');
  }
  const dbUrl = `postgres://${startedPostgresContainer.getUsername()}:${startedPostgresContainer.getPassword()}@${startedPostgresContainer.getHost()}:${startedPostgresContainer.getPort()}`;
  child_process.execSync(`export DATABASE_URL=${dbUrl} && pnpm prisma migrate deploy`);
  return {
    dbUrl: dbUrl ?? '',
    defichain: {
      key: defichain?.key ?? '',
      whaleURL: defichain?.whaleURL ?? '',
      network: defichain?.network ?? EnvironmentNetwork.LocalPlayground,
      transferFee: defichain?.transferFee,
      supportedTokens: defichain?.supportedTokens,
    },
    ethereum: {
      rpcUrl: startedHardhatContainer?.rpcUrl ?? '',
      transferFee: ethereum?.transferFee,
      supportedTokens: ethereum?.supportedTokens,
      contracts: {
        bridgeProxy: {
          address: testnet?.bridgeContractAddress ?? '',
          deploymentBlockNumber: testnet?.bridgeProxyDeploymentBlockNumber ?? '',
          deploymentTxIndexInBlock: testnet?.bridgeProxyDeploymentTransactionIndex ?? '',
        },
        queueBridgeProxy: {
          address: testnet?.bridgeQueueContractAddress ?? '',
          deploymentBlockNumber: testnet?.bridgeQueueProxyDeploymentBlockNumber ?? '',
          deploymentTxIndexInBlock: testnet?.bridgeQueueProxyDeploymentTransactionIndex ?? '',
        },
        USDC: {
          address: usdcAddress,
        },
        USDT: {
          address: usdtAddress,
        },
        WBTC: {
          address: wbtcAddress,
        },
        EUROC: {
          address: eurocAddress,
        },
        MATIC: {
          address: maticAddress,
        },
        DFI: {
          address: dfiAddress,
        },
      },
      ethWalletPrivKey: testnet?.ethWalletPrivKey,
      queueTokensMinAmt: ethereum?.queueTokensMinAmt,
    },
  };
}

type BuildTestConfigParams = DeepPartial<OptionalBuildTestConfigParams> & {
  startedPostgresContainer: StartedPostgreSqlContainer;
};

type OptionalBuildTestConfigParams = {
  dbUrl: string;
  defichain: {
    whaleURL: string;
    key: string;
    network: string;
    transferFee: string;
    dustUTXO: string;
    supportedTokens: string;
  };
  ethereum: {
    transferFee: string;
    supportedTokens: string;
    queueTokensMinAmt: {
      ETH: string;
      WBTC: string;
      USDT: string;
      USDC: string;
      EUROC: string;
      DFI: string;
      MATIC: string;
    };
  };
  startedHardhatContainer: StartedHardhatNetworkContainer | StartedHardhatNetworkQueueContainer;
  testnet: {
    bridgeContractAddress: string;
    bridgeQueueContractAddress: string;
    bridgeProxyDeploymentBlockNumber: string;
    bridgeProxyDeploymentTransactionIndex: string;
    bridgeQueueProxyDeploymentBlockNumber: string;
    bridgeQueueProxyDeploymentTransactionIndex: string;
    ethWalletPrivKey: string;
  };
  usdcAddress: string;
  usdtAddress: string;
  wbtcAddress: string;
  eurocAddress: string;
  maticAddress: string;
  dfiAddress: string;
};
