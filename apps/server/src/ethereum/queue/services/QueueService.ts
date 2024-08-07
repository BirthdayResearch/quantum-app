import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeFiChainTransactionStatus, EthereumTransactionStatus, Prisma, QueueStatus } from '@prisma/client';
import { EnvironmentNetwork } from '@waveshq/walletkit-core';
import BigNumber from 'bignumber.js';
import { BigNumber as EthBigNumber, ethers } from 'ethers';
import { BridgeQueue, BridgeQueue__factory, ERC20__factory } from 'smartcontracts-queue';

import { DeFiChainTransactionService } from '../../../defichain/services/DeFiChainTransactionService';
import { ETHERS_RPC_PROVIDER } from '../../../modules/EthersModule';
import { ApiPagedResponse } from '../../../pagination/ApiPagedResponse';
import { PaginationQuery } from '../../../pagination/ApiQuery';
import { PrismaService } from '../../../PrismaService';
import { getDTokenDetailsByWToken } from '../../../utils/TokensUtils';
import { ContractType, VerificationService } from '../../services/VerificationService';
import { OrderBy, Queue, VerifyQueueTransactionDto } from '../model/Queue';

@Injectable()
export class QueueService {
  private contract: BridgeQueue;

  private contractAddress: string;

  private network: EnvironmentNetwork;

  private readonly MIN_REQUIRED_EVM_CONFIRMATION = 65;

  private readonly MIN_REQUIRED_DFC_CONFIRMATION = 35;

  private readonly DAYS_TO_EXPIRY = 3;

  constructor(
    @Inject(ETHERS_RPC_PROVIDER) readonly ethersRpcProvider: ethers.providers.StaticJsonRpcProvider,
    private configService: ConfigService,
    private readonly deFiChainTransactionService: DeFiChainTransactionService,
    private verificationService: VerificationService,
    private prisma: PrismaService,
  ) {
    this.network = this.configService.getOrThrow<EnvironmentNetwork>(`defichain.network`);
    this.contractAddress = this.configService.getOrThrow('ethereum.contracts.queueBridgeProxy.address');
    this.contract = BridgeQueue__factory.connect(this.contractAddress, this.ethersRpcProvider);
  }

  async getQueue(transactionHash: string, status?: QueueStatus): Promise<Queue> {
    try {
      const queue = await this.prisma.ethereumQueue.findFirst({
        where: {
          transactionHash,
          status,
        },
        include: {
          adminQueue: {
            select: {
              sendTransactionHash: true,
            },
          },
        },
      });

      if (!queue) {
        throw new Error('Queue not found');
      }

      return {
        ...queue,
        id: queue.id.toString(),
      };
    } catch (e: any) {
      throw new HttpException(
        {
          status: e.code || HttpStatus.INTERNAL_SERVER_ERROR,
          error: `API call to get queue was unsuccessful: ${e.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
        {
          cause: e,
        },
      );
    }
  }

  async listQueue(
    query: PaginationQuery = {
      size: 10,
    },
    orderBy?: OrderBy,
    status?: QueueStatus[],
  ): Promise<ApiPagedResponse<Queue>> {
    try {
      const next = query.next !== undefined ? BigInt(query.next) : undefined;
      const size = Number(query.size);

      let orderById;

      switch (orderBy) {
        case OrderBy.DESC:
          orderById = Prisma.SortOrder.desc;
          break;
        case OrderBy.ASC:
        default:
          orderById = Prisma.SortOrder.asc;
          break;
      }

      // condition for status filter for where clause
      const condition = {
        status: {
          in: status,
        },
      };

      const [queueCount, queueList] = await this.prisma.$transaction([
        this.prisma.ethereumQueue.count({
          where: condition,
        }),
        this.prisma.ethereumQueue.findMany({
          where: condition,
          cursor: next ? { id: next } : undefined,
          take: size + 1, // to get extra 1 to check for next page
          orderBy: {
            id: orderById,
          },
          include: {
            adminQueue: {
              select: {
                sendTransactionHash: true,
              },
            },
          },
        }),
      ]);

      if (!queueList || queueList.length === 0) {
        return ApiPagedResponse.of([], size);
      }

      const stringifiedQueueList = queueList.map((queue) => ({
        ...queue,
        id: queue.id.toString(),
      }));

      return ApiPagedResponse.of(stringifiedQueueList, size, (queue) => queue.id, queueCount.toString());
    } catch (e: any) {
      throw new HttpException(
        {
          status: e.code || HttpStatus.INTERNAL_SERVER_ERROR,
          error: `API call to list queue was unsuccessful: ${e.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
        {
          cause: e,
        },
      );
    }
  }

  async createQueueTransaction(transactionHash: string): Promise<Queue> {
    try {
      const queueTokensMinAmt = this.configService.getOrThrow('ethereum.queueTokensMinAmt', {});

      const txHashFound = await this.prisma.ethereumQueue.findFirst({
        where: {
          transactionHash,
        },
      });
      if (txHashFound) {
        throw new Error('Transaction Hash already exists');
      }

      const { parsedTxnData, errorMsg } = await this.verificationService.verifyIfValidTxn(
        transactionHash,
        this.contractAddress,
        ContractType.queue,
      );

      if (!parsedTxnData) {
        throw new Error(errorMsg);
      }

      const onChainTxnDetail = await this.ethersRpcProvider.getTransaction(transactionHash);
      const { params } = this.verificationService.decodeTxnData(parsedTxnData);
      const { _defiAddress: defiAddress, _tokenAddress: tokenAddress, _amount: amount } = params;

      const toAddress = ethers.utils.toUtf8String(defiAddress);

      let transferAmount = new BigNumber(0);
      let dTokenDetails;

      // expiry date calculations
      const currDate = new Date();
      const expiryDate = new Date(currDate.setDate(currDate.getDate() + this.DAYS_TO_EXPIRY)).toISOString();

      const bigNumAmt = new BigNumber(amount);

      // eth transfer
      if (tokenAddress === ethers.constants.AddressZero) {
        const ethAmount = EthBigNumber.from(onChainTxnDetail.value).toString();
        transferAmount = new BigNumber(ethAmount).dividedBy(new BigNumber(10).pow(18));
        dTokenDetails = getDTokenDetailsByWToken('ETH', this.network);
      } else {
        // wToken transfer
        const evmTokenContract = new ethers.Contract(tokenAddress, ERC20__factory.abi, this.ethersRpcProvider);
        const [wTokenSymbol, wTokenDecimals] = await Promise.all([
          evmTokenContract.symbol(),
          evmTokenContract.decimals(),
        ]);
        transferAmount = bigNumAmt.dividedBy(new BigNumber(10).pow(wTokenDecimals));
        dTokenDetails = getDTokenDetailsByWToken(wTokenSymbol, this.network);
      }
      const tokenMinAmt = queueTokensMinAmt[dTokenDetails.symbol];
      if (bigNumAmt.isLessThan(tokenMinAmt)) {
        throw new Error('Transfer amount is less than the minimum amount');
      }

      if (transferAmount.isNaN() || transferAmount.isLessThanOrEqualTo(0)) {
        throw new Error('Transfer amount is less than or equal to zero');
      }

      const queueRecord = await this.prisma.ethereumQueue.create({
        data: {
          transactionHash,
          status: QueueStatus.DRAFT,
          ethereumStatus: EthereumTransactionStatus.NOT_CONFIRMED,
          amount: transferAmount.toString(),
          defichainAddress: toAddress,
          expiryDate,
          tokenSymbol: dTokenDetails.symbol,
        },
      });

      return {
        ...queueRecord,
        id: queueRecord.id.toString(),
      };
    } catch (e: any) {
      throw new HttpException(
        {
          status: e.status ?? (e.code || HttpStatus.INTERNAL_SERVER_ERROR),
          error: `API call for create Queue transaction was unsuccessful: ${e.message}`,
        },
        e.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
        {
          cause: e,
        },
      );
    }
  }

  async verify(transactionHash: string): Promise<VerifyQueueTransactionDto> {
    try {
      const { parsedTxnData, errorMsg } = await this.verificationService.verifyIfValidTxn(
        transactionHash,
        this.contractAddress,
        ContractType.queue,
      );

      if (!parsedTxnData) {
        throw new Error(errorMsg);
      }

      const [txReceipt, currentBlockNumber] = await Promise.all([
        this.ethersRpcProvider.getTransactionReceipt(transactionHash),
        this.ethersRpcProvider.getBlockNumber(),
      ]);
      const numberOfConfirmations = BigNumber.max(currentBlockNumber - txReceipt.blockNumber, 0).toNumber();

      if (numberOfConfirmations < this.MIN_REQUIRED_EVM_CONFIRMATION) {
        return { numberOfConfirmations, isConfirmed: false };
      }

      const txHashFound = await this.prisma.ethereumQueue.findFirst({
        where: {
          transactionHash,
        },
      });

      if (!txHashFound) {
        throw new Error('Transaction Hash does not exist');
      }

      if (txHashFound.status === QueueStatus.DRAFT) {
        const adminQueueTxn = await this.prisma.adminEthereumQueue.findFirst({
          where: {
            queueTransactionHash: transactionHash,
          },
        });
        if (adminQueueTxn) {
          throw new Error('Transaction Hash already exists in admin table');
        }
        await this.prisma.ethereumQueue.update({
          where: {
            transactionHash,
          },
          data: {
            ethereumStatus: EthereumTransactionStatus.CONFIRMED,
            status: QueueStatus.IN_PROGRESS,
            adminQueue: {
              create: {
                defichainStatus: DeFiChainTransactionStatus.NOT_CONFIRMED,
              },
            },
          },
        });
      } else if (txHashFound.ethereumStatus !== EthereumTransactionStatus.CONFIRMED) {
        return {
          numberOfConfirmations,
          isConfirmed: false,
        };
      }

      return { numberOfConfirmations, isConfirmed: true };
    } catch (e: any) {
      throw new HttpException(
        {
          status: e.code || HttpStatus.INTERNAL_SERVER_ERROR,
          error: `API call for verify was unsuccessful: ${e.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
        {
          cause: e,
        },
      );
    }
  }

  async defichainVerify(transactionHash: string): Promise<VerifyQueueTransactionDto> {
    try {
      const { blockHash, blockHeight, numberOfConfirmations } =
        await this.deFiChainTransactionService.getTxn(transactionHash);

      if (numberOfConfirmations < this.MIN_REQUIRED_DFC_CONFIRMATION) {
        return { numberOfConfirmations, isConfirmed: false };
      }

      const adminQueueTxnExist = await this.prisma.adminEthereumQueue.findUnique({
        where: {
          sendTransactionHash: transactionHash,
        },
      });

      if (!adminQueueTxnExist) {
        throw new Error('Transaction Hash does not exists in admin table');
      }

      if (adminQueueTxnExist.defichainStatus === DeFiChainTransactionStatus.NOT_CONFIRMED) {
        await this.prisma.adminEthereumQueue.update({
          where: { sendTransactionHash: transactionHash },
          data: { defichainStatus: DeFiChainTransactionStatus.CONFIRMED, blockHash, blockHeight },
        });
      }

      return { numberOfConfirmations, isConfirmed: true };
    } catch (e: any) {
      throw new HttpException(
        {
          status: e.code || HttpStatus.INTERNAL_SERVER_ERROR,
          error: `API call for verify was unsuccessful: ${e.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
        {
          cause: e,
        },
      );
    }
  }
}
