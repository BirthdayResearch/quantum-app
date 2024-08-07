import { fromAddress } from '@defichain/jellyfish-address';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EthereumTransactionStatus } from '@prisma/client';
import { EnvironmentNetwork } from '@waveshq/walletkit-core';
import BigNumber from 'bignumber.js';
import { BigNumber as EthBigNumber, ethers } from 'ethers';
import { BridgeV1, BridgeV1__factory, ERC20__factory } from 'smartcontracts';

import { SupportedEVMTokenSymbols } from '../../AppConfig';
import { TokenSymbol } from '../../defichain/model/VerifyDto';
import { WhaleApiClientProvider } from '../../defichain/providers/WhaleApiClientProvider';
import { WhaleWalletProvider } from '../../defichain/providers/WhaleWalletProvider';
import { DeFiChainTransactionService } from '../../defichain/services/DeFiChainTransactionService';
import { SendService } from '../../defichain/services/SendService';
import { ETHERS_RPC_PROVIDER } from '../../modules/EthersModule';
import { PrismaService } from '../../PrismaService';
import { getNextDayTimestampInSec } from '../../utils/DateUtils';
import { getDTokenDetailsByWToken } from '../../utils/TokensUtils';
import { ContractType, ErrorMsgTypes, VerificationService } from './VerificationService';

@Injectable()
export class EVMTransactionConfirmerService {
  private contract: BridgeV1;

  private contractAddress: string;

  private network: EnvironmentNetwork;

  private readonly logger: Logger;

  private readonly MIN_REQUIRED_EVM_CONFIRMATION = 65;

  private readonly MIN_REQUIRED_DFC_CONFIRMATION = 35;

  constructor(
    @Inject(ETHERS_RPC_PROVIDER) readonly ethersRpcProvider: ethers.providers.StaticJsonRpcProvider,
    private readonly clientProvider: WhaleApiClientProvider,
    private readonly sendService: SendService,
    private readonly verificationService: VerificationService,
    private readonly deFiChainTransactionService: DeFiChainTransactionService,
    private readonly whaleWalletProvider: WhaleWalletProvider,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.network = this.configService.getOrThrow<EnvironmentNetwork>(`defichain.network`);
    this.contractAddress = this.configService.getOrThrow('ethereum.contracts.bridgeProxy.address');
    this.contract = BridgeV1__factory.connect(this.contractAddress, this.ethersRpcProvider);
    this.logger = new Logger(EVMTransactionConfirmerService.name);
  }

  async getBalance(tokenSymbol: SupportedEVMTokenSymbols): Promise<string> {
    if (!SupportedEVMTokenSymbols[tokenSymbol]) {
      throw new BadRequestException(`Token: "${tokenSymbol}" is not supported`);
    }

    // Format for ETH
    if (tokenSymbol === SupportedEVMTokenSymbols.ETH) {
      const balance = await this.ethersRpcProvider.getBalance(this.contract.address);
      return ethers.utils.formatEther(balance);
    }

    // Format for all other assets
    const tokenContract = new ethers.Contract(
      this.configService.getOrThrow(`ethereum.contracts.${SupportedEVMTokenSymbols[tokenSymbol]}.address`),
      ERC20__factory.abi,
      this.ethersRpcProvider,
    );
    const balance = await tokenContract.balanceOf(this.contract.address);
    const assetDecimalPlaces = await tokenContract.decimals();
    return ethers.utils.formatUnits(balance, assetDecimalPlaces);
  }

  async handleTransaction(transactionHash: string): Promise<HandledEVMTransaction> {
    const { parsedTxnData } = await this.verificationService.verifyIfValidTxn(
      transactionHash,
      this.contractAddress,
      ContractType.instant,
    );
    const txReceipt = await this.ethersRpcProvider.getTransactionReceipt(transactionHash);

    // if transaction is still pending
    if (txReceipt === null) {
      return { numberOfConfirmations: 0, isConfirmed: false };
    }

    // Sanity check that the contractAddress, decoded name and signature are correct
    if (txReceipt.to !== this.contractAddress || !parsedTxnData) {
      return { numberOfConfirmations: 0, isConfirmed: false };
    }

    // if transaction is reverted
    const isReverted = txReceipt.status === 0;
    if (isReverted === true) {
      throw new BadRequestException(`Transaction Reverted`);
    }

    const currentBlockNumber = await this.ethersRpcProvider.getBlockNumber();
    const numberOfConfirmations = BigNumber.max(currentBlockNumber - txReceipt.blockNumber, 0).toNumber();
    const txHashFound = await this.prisma.bridgeEventTransactions.findFirst({
      where: {
        transactionHash,
      },
    });
    if (txHashFound === null) {
      if (numberOfConfirmations < this.MIN_REQUIRED_EVM_CONFIRMATION) {
        await this.prisma.bridgeEventTransactions.create({
          data: {
            transactionHash,
            status: EthereumTransactionStatus.NOT_CONFIRMED,
          },
        });
        return { numberOfConfirmations, isConfirmed: false };
      }
      await this.prisma.bridgeEventTransactions.create({
        data: {
          transactionHash,
          status: EthereumTransactionStatus.CONFIRMED,
        },
      });
      return { numberOfConfirmations, isConfirmed: true };
    }
    if (numberOfConfirmations < this.MIN_REQUIRED_EVM_CONFIRMATION) {
      return { numberOfConfirmations, isConfirmed: false };
    }
    await this.prisma.bridgeEventTransactions.update({
      where: {
        id: txHashFound?.id,
      },
      data: {
        status: EthereumTransactionStatus.CONFIRMED,
      },
    });
    return { numberOfConfirmations, isConfirmed: true };
  }

  async signClaim({
    receiverAddress,
    tokenAddress,
    tokenSymbol,
    amount,
    uniqueDfcAddress,
  }: SignClaim): Promise<{ signature: string; nonce: number; deadline: number }> {
    try {
      this.logger.log(`[Sign] ${amount} ${tokenAddress} ${uniqueDfcAddress} ${receiverAddress}`);

      // check and return same claim details if txn is already signed previously
      const existingTxn = await this.prisma.deFiChainAddressIndex.findFirst({
        where: { address: uniqueDfcAddress },
      });
      if (existingTxn && existingTxn.claimSignature) {
        return {
          signature: existingTxn.claimSignature,
          nonce: Number(existingTxn.claimNonce),
          deadline: Number(existingTxn.claimDeadline),
        };
      }

      // Connect signer ETH wallet (admin/operational wallet)
      const wallet = new ethers.Wallet(
        this.configService.getOrThrow('ethereum.ethWalletPrivKey'),
        this.ethersRpcProvider,
      );

      const { chainId } = await this.ethersRpcProvider.getNetwork();
      const nonce: EthBigNumber = await this.contract.eoaAddressToNonce(receiverAddress);
      const domainName = await this.contract.NAME();
      const domainVersion = await this.contract.version();
      const deadline = getNextDayTimestampInSec();

      const domain = {
        name: domainName,
        chainId,
        verifyingContract: this.contract.address,
        version: domainVersion,
      };
      const types = {
        CLAIM: [
          { name: 'to', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
          { name: 'tokenAddress', type: 'address' },
        ],
      };

      // Parse amount based on token symbol
      let parsedAmount: EthBigNumber;
      if (tokenSymbol === TokenSymbol.ETH) {
        parsedAmount = ethers.utils.parseEther(amount);
      } else {
        // ERC20 token
        const tokenContract = new ethers.Contract(tokenAddress, ERC20__factory.abi, this.ethersRpcProvider);
        const tokenDecimalPlaces = await tokenContract.decimals();
        parsedAmount = ethers.utils.parseUnits(amount, tokenDecimalPlaces);
      }

      const data = {
        to: receiverAddress,
        amount: parsedAmount,
        nonce,
        deadline,
        tokenAddress,
      };

      // eslint-disable-next-line no-underscore-dangle
      const signature = await wallet._signTypedData(domain, types, data);

      // Store on DB to prevent double-signing
      await this.prisma.deFiChainAddressIndex.update({
        where: {
          address: uniqueDfcAddress,
        },
        data: {
          claimNonce: nonce.toString(),
          claimDeadline: deadline.toString(),
          claimSignature: signature,
          claimAmount: amount,
          tokenSymbol,
          ethReceiverAddress: receiverAddress,
        },
      });

      this.logger.log(`[Sign SUCCESS] ${amount} ${tokenAddress} ${uniqueDfcAddress} ${receiverAddress}`);
      return { signature, nonce: nonce.toNumber(), deadline };
    } catch (e: any) {
      this.logger.log(`[Sign ERROR] ${amount} ${tokenAddress} ${uniqueDfcAddress} ${receiverAddress}`);
      throw new Error('There is a problem in signing this claim', { cause: e });
    }
  }

  async allocateDFCFund(
    transactionHash: string,
  ): Promise<{ transactionHash: string; isConfirmed: boolean; numberOfConfirmationsDfc: number }> {
    try {
      this.logger.log(`[AllocateDFCFund] ${transactionHash}`);

      const txDetails = await this.prisma.bridgeEventTransactions.findFirst({
        where: {
          transactionHash,
        },
      });

      // check if tx details are available in db
      if (!txDetails) {
        throw new Error('Transaction detail not available');
      }

      // check if fund is already allocated for the given address
      if (txDetails.sendTransactionHash) {
        throw new Error('Fund already allocated');
      }

      if (txDetails.unconfirmedSendTransactionHash) {
        const {
          blockHash,
          blockHeight,
          numberOfConfirmations: numberOfConfirmationsDfc,
        } = await this.deFiChainTransactionService.getTxn(txDetails.unconfirmedSendTransactionHash);

        // wait for min number of confirmations before confirming the txn
        if (numberOfConfirmationsDfc < this.MIN_REQUIRED_DFC_CONFIRMATION) {
          return {
            transactionHash: txDetails.unconfirmedSendTransactionHash,
            isConfirmed: false,
            numberOfConfirmationsDfc,
          };
        }

        await this.prisma.bridgeEventTransactions.update({
          where: {
            id: txDetails.id,
          },
          data: {
            sendTransactionHash: txDetails.unconfirmedSendTransactionHash,
            blockHeight,
            blockHash,
          },
        });

        this.logger.log(`[AllocateDFCFund SUCCESS] ${transactionHash} ${txDetails.unconfirmedSendTransactionHash}`);

        return {
          transactionHash: txDetails.unconfirmedSendTransactionHash,
          isConfirmed: true,
          numberOfConfirmationsDfc: this.MIN_REQUIRED_DFC_CONFIRMATION,
        };
      }

      // check if txn is confirmed or not
      if (txDetails.status !== EthereumTransactionStatus.CONFIRMED) {
        throw new Error('Transaction is not yet confirmed');
      }

      const txReceipt = await this.ethersRpcProvider.getTransactionReceipt(transactionHash);
      const { parsedTxnData } = await this.verificationService.verifyIfValidTxn(
        transactionHash,
        this.contractAddress,
        ContractType.instant,
      );

      if (!txReceipt) {
        throw new Error('Transaction is not yet available');
      }

      // Sanity check that the contractAddress, decoded name and signature are correct
      if (!parsedTxnData || txReceipt.to !== this.contractAddress) {
        return {
          transactionHash: '',
          isConfirmed: false,
          numberOfConfirmationsDfc: 0,
        };
      }

      // if transaction is reverted
      const isReverted = txReceipt.status === 0;
      if (isReverted === true) {
        throw new BadRequestException(`Transaction Reverted`);
      }

      const currentBlockNumber = await this.ethersRpcProvider.getBlockNumber();
      const numberOfConfirmations = currentBlockNumber - txReceipt.blockNumber;

      // check if tx is confirmed with min required confirmation
      if (numberOfConfirmations < this.MIN_REQUIRED_EVM_CONFIRMATION) {
        throw new Error('Transaction is not yet confirmed with min block threshold');
      }

      const { toAddress, ...dTokenDetails } = await this.getEVMTxnDetails(transactionHash);
      // check is send address belongs to current network or
      const decodedAddress = fromAddress(toAddress, this.clientProvider.remapNetwork(this.network));
      if (decodedAddress === undefined) {
        throw new Error(`Invalid send address for DeFiChain ${this.network}`);
      }

      const amount = new BigNumber(dTokenDetails.amount);
      const fee = amount.multipliedBy(this.configService.getOrThrow('ethereum.transferFee'));
      const amountLessFee = BigNumber.max(amount.minus(fee), 0);

      // check hot wallet has enough UTXO balance after reserving a configurable amount
      if (dTokenDetails.symbol === 'DFI') {
        const hotWalletBalance = await this.whaleWalletProvider.getHotWalletBalance();
        const dfcReservedAmt = this.configService.getOrThrow('defichain.dfcReservedAmt', 0);
        const DFIBalance = BigNumber.max(0, new BigNumber(hotWalletBalance).minus(dfcReservedAmt).minus(amountLessFee));
        if (DFIBalance.isLessThanOrEqualTo(0) || DFIBalance.isNaN()) {
          this.logger.log(
            `[Sending UTXO] Failed to send because insufficient DFI UTXO in hot wallet after deducting reserved UTXO`,
          );
          throw new BadRequestException('Insufficient DFI liquidity');
        }
      }

      const sendTxPayload = {
        ...dTokenDetails,
        amount: amountLessFee,
      };

      this.logger.log(
        `[Send] ${sendTxPayload.amount.toFixed(8)} ${fee.toFixed(8)} ${amountLessFee.toFixed(8)} ${sendTxPayload.id} ${
          sendTxPayload.symbol
        } ${toAddress}`,
      );

      const unconfirmedSendTxnHash = await this.sendService.send(toAddress, sendTxPayload);
      // update status in db
      await this.prisma.bridgeEventTransactions.update({
        where: {
          id: txDetails.id,
        },
        data: {
          amount: amountLessFee.toFixed(8),
          tokenSymbol: sendTxPayload.symbol,
          unconfirmedSendTransactionHash: unconfirmedSendTxnHash,
        },
      });

      this.logger.log(`[AllocateDFCFund INITIATED] ${transactionHash} ${unconfirmedSendTxnHash}`);
      return {
        transactionHash: unconfirmedSendTxnHash,
        isConfirmed: false,
        numberOfConfirmationsDfc: 0,
      };
    } catch (e: any) {
      throw new HttpException(
        {
          status: e.code || HttpStatus.INTERNAL_SERVER_ERROR,
          error: `There is a problem in allocating fund: ${e.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
        {
          cause: e,
          description: `[AllocateDFCFund ERROR] ${transactionHash}`,
        },
      );
    }
  }

  async getTransactionDetails(transactionHash: string): Promise<{
    id: string;
    symbol: string;
    amount: BigNumber;
    toAddress: string;
  }> {
    try {
      const txHashFound = await this.prisma.bridgeEventTransactions.findFirst({
        where: {
          transactionHash,
        },
      });

      if (!txHashFound) {
        throw new NotFoundException(ErrorMsgTypes.TxnNotFound);
      }
      await this.verificationService.verifyIfValidTxn(transactionHash, this.contractAddress, ContractType.instant);

      const { toAddress, ...dTokenDetails } = await this.getEVMTxnDetails(transactionHash);
      return { ...dTokenDetails, toAddress };
    } catch (e: any) {
      throw new HttpException(
        {
          status: e.code || HttpStatus.INTERNAL_SERVER_ERROR,
          error: `API call for getTransactionDetails was unsuccessful: ${e.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
        {
          cause: e,
        },
      );
    }
  }

  private async getEVMTxnDetails(transactionHash: string): Promise<{
    id: string;
    symbol: string;
    amount: BigNumber;
    toAddress: string;
  }> {
    const onChainTxnDetail = await this.ethersRpcProvider.getTransaction(transactionHash);
    const parsedTxnData = await this.verificationService.parseTxnHash(transactionHash, ContractType.instant);
    const { params } = this.verificationService.decodeTxnData(parsedTxnData);

    const { _defiAddress: defiAddress, _tokenAddress: tokenAddress, _amount: amount } = params;
    const toAddress = ethers.utils.toUtf8String(defiAddress);
    // eth transfer
    if (tokenAddress === ethers.constants.AddressZero) {
      const ethAmount = EthBigNumber.from(onChainTxnDetail.value).toString();
      const transferAmount = new BigNumber(ethAmount).dividedBy(new BigNumber(10).pow(18));
      const dTokenDetails = getDTokenDetailsByWToken('ETH', this.network);
      return { ...dTokenDetails, amount: transferAmount, toAddress };
    }
    // wToken transfer
    const evmTokenContract = new ethers.Contract(tokenAddress, ERC20__factory.abi, this.ethersRpcProvider);
    const wTokenSymbol = await evmTokenContract.symbol();
    const wTokenDecimals = await evmTokenContract.decimals();
    const transferAmount = new BigNumber(amount).dividedBy(new BigNumber(10).pow(wTokenDecimals));
    const dTokenDetails = getDTokenDetailsByWToken(wTokenSymbol, this.network);

    return { id: dTokenDetails.id, symbol: dTokenDetails.symbol, amount: transferAmount, toAddress };
  }
}

interface SignClaim {
  receiverAddress: string;
  tokenAddress: string;
  tokenSymbol: TokenSymbol;
  amount: string;
  uniqueDfcAddress: string;
}

export interface HandledEVMTransaction {
  numberOfConfirmations: number;
  isConfirmed: boolean;
}
