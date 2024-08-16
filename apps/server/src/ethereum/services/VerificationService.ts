import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BigNumber as EthBigNumber, ethers } from 'ethers';
import { BridgeV1__factory } from 'smartcontracts';
import { BridgeQueue__factory } from 'smartcontracts-queue';

import { ETHERS_RPC_PROVIDER } from '../../modules/EthersModule';

export enum ContractType {
  instant = 'instant',
  queue = 'queue',
}

export enum ErrorMsgTypes {
  InaccurateNameAndSignature = 'Decoded function name or signature is inaccurate',
  PendingTxn = 'Transaction is still pending',
  InaccurateContractAddress = 'Contract Address in the Transaction Receipt is inaccurate',
  RevertedTxn = 'Transaction Reverted',
  TxnNotFound = 'Transaction not found',
  QueueNotFound = 'Queue not found',
  TxSentBeforeDeployment = 'This transaction is sent before deployment',
}
export interface VerifyIfValidTxnDto {
  parsedTxnData?: {
    etherInterface: ethers.utils.Interface;
    parsedTxnData: ethers.utils.TransactionDescription;
  };
  errorMsg?: ErrorMsgTypes;
}

type ContractInformationType = {
  [key in ContractType]: {
    interface: readonly Object[];
    name: string;
    signature: string;
    deploymentBlockHeight: number;
    deploymentTxIndex: number;
  };
};

@Injectable()
export class VerificationService {
  private contract: ContractInformationType;

  constructor(
    @Inject(ETHERS_RPC_PROVIDER) readonly ethersRpcProvider: ethers.providers.StaticJsonRpcProvider,
    private configService: ConfigService,
  ) {
    this.contract = {
      [ContractType.instant]: {
        interface: BridgeV1__factory.abi,
        name: 'bridgeToDeFiChain',
        signature: 'bridgeToDeFiChain(bytes,address,uint256)',
        deploymentBlockHeight: Number(
          this.configService.getOrThrow('ethereum.contracts.bridgeProxy.deploymentBlockNumber'),
        ),
        deploymentTxIndex: Number(
          this.configService.getOrThrow('ethereum.contracts.bridgeProxy.deploymentTxIndexInBlock'),
        ),
      },
      [ContractType.queue]: {
        interface: BridgeQueue__factory.abi,
        name: 'bridgeToDeFiChain',
        signature: 'bridgeToDeFiChain(bytes,address,uint256)',
        deploymentBlockHeight: Number(
          this.configService.getOrThrow('ethereum.contracts.queueBridgeProxy.deploymentBlockNumber'),
        ),
        deploymentTxIndex: Number(
          this.configService.getOrThrow('ethereum.contracts.queueBridgeProxy.deploymentTxIndexInBlock'),
        ),
      },
    };
  }

  async verifyIfValidTxn(
    transactionHash: string,
    contractAddress: string,
    contractType: ContractType,
  ): Promise<VerifyIfValidTxnDto> {
    const [parsedTxnData, txReceipt] = await Promise.all([
      this.parseTxnHash(transactionHash, contractType),
      this.ethersRpcProvider.getTransactionReceipt(transactionHash),
    ]);

    // Sanity check that the decoded function name and signature are correct
    if (
      parsedTxnData.parsedTxnData.name !== this.contract[contractType].name ||
      parsedTxnData.parsedTxnData.signature !== this.contract[contractType].signature
    ) {
      throw new BadRequestException(ErrorMsgTypes.InaccurateNameAndSignature);
    }

    // if transaction is still pending
    if (txReceipt === null) {
      throw new NotFoundException(ErrorMsgTypes.PendingTxn);
    }

    // Sanity check that the contractAddress is accurate in the Transaction Receipt, getAddress() will inject the checksum by upper casing the address
    if (ethers.utils.getAddress(txReceipt.to) !== ethers.utils.getAddress(contractAddress)) {
      throw new BadRequestException(ErrorMsgTypes.InaccurateContractAddress);
    }

    // if transaction is reverted
    const isReverted = txReceipt.status === 0;
    if (isReverted === true) {
      throw new BadRequestException(ErrorMsgTypes.RevertedTxn);
    }

    if (
      txReceipt.blockNumber < this.contract[contractType].deploymentBlockHeight ||
      (txReceipt.blockNumber === this.contract[contractType].deploymentBlockHeight &&
        txReceipt.transactionIndex <= this.contract[contractType].deploymentTxIndex)
    )
      throw new BadRequestException(ErrorMsgTypes.TxSentBeforeDeployment);
    // TODO: Validate the txns event logs here through this.ethersRpcProvider.getLogs()

    return { parsedTxnData };
  }

  async parseTxnHash(
    transactionHash: string,
    contractType: ContractType,
  ): Promise<{
    etherInterface: ethers.utils.Interface;
    parsedTxnData: ethers.utils.TransactionDescription;
  }> {
    const onChainTxnDetail = await this.ethersRpcProvider.getTransaction(transactionHash);
    if (onChainTxnDetail === null) {
      throw new NotFoundException(ErrorMsgTypes.PendingTxn);
    }
    const etherInterface = new ethers.utils.Interface(this.contract[contractType].interface);
    const parsedTxnData = etherInterface.parseTransaction({
      data: onChainTxnDetail.data,
      value: onChainTxnDetail.value,
    });

    return { etherInterface, parsedTxnData };
  }

  decodeTxnData({
    etherInterface,
    parsedTxnData,
  }: {
    etherInterface: ethers.utils.Interface;
    parsedTxnData: ethers.utils.TransactionDescription;
  }) {
    const fragment = etherInterface.getFunction(parsedTxnData.name);
    const params = parsedTxnData.args.reduce((res, param, i) => {
      let parsedParam = param;
      const isUint = fragment.inputs[i].type.indexOf('uint') === 0;
      const isInt = fragment.inputs[i].type.indexOf('int') === 0;
      const isAddress = fragment.inputs[i].type.indexOf('address') === 0;

      if (isUint || isInt) {
        const isArray = Array.isArray(param);

        if (isArray) {
          parsedParam = param.map((val) => EthBigNumber.from(val).toString());
        } else {
          parsedParam = EthBigNumber.from(param).toString();
        }
      }

      // Addresses returned by web3 are randomly cased so we need to standardize and lowercase all
      if (isAddress) {
        const isArray = Array.isArray(param);
        if (isArray) {
          parsedParam = param.map((_) => _.toLowerCase());
        } else {
          parsedParam = param.toLowerCase();
        }
      }
      return {
        ...res,
        [fragment.inputs[i].name]: parsedParam,
      };
    }, {});

    return {
      params,
      name: parsedTxnData.name,
    };
  }
}
