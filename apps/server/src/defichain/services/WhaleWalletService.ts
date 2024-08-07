import { fromAddress } from '@defichain/jellyfish-address';
import { AddressToken } from '@defichain/whale-api-client/dist/api/address';
import { WhaleWalletAccount } from '@defichain/whale-api-wallet';
import { BadRequestException, HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeFiChainAddressIndex } from '@prisma/client';
import { EnvironmentNetwork, getJellyfishNetwork } from '@waveshq/walletkit-core';
import BigNumber from 'bignumber.js';

import { SupportedDFCTokenSymbols } from '../../AppConfig';
import { CustomErrorCodes } from '../../CustomErrorCodes';
import { EVMTransactionConfirmerService } from '../../ethereum/services/EVMTransactionConfirmerService';
import { PrismaService } from '../../PrismaService';
import { TokenSymbol, VerifyObject } from '../model/VerifyDto';
import { WhaleApiClientProvider } from '../providers/WhaleApiClientProvider';
import { WhaleWalletProvider } from '../providers/WhaleWalletProvider';
import { DeFiChainTransactionService } from './DeFiChainTransactionService';
import { SendService } from './SendService';

@Injectable()
export class WhaleWalletService {
  private readonly logger: Logger;

  private readonly dustUTXO: number;

  private readonly MIN_REQUIRED_DFC_CONFIRMATION = 35;

  constructor(
    private readonly whaleWalletProvider: WhaleWalletProvider,
    private readonly clientProvider: WhaleApiClientProvider,
    private readonly deFiChainTransactionService: DeFiChainTransactionService,
    private readonly evmTransactionService: EVMTransactionConfirmerService,
    private configService: ConfigService,
    private prisma: PrismaService,
    private readonly sendService: SendService,
  ) {
    this.logger = new Logger(WhaleWalletService.name);
    this.dustUTXO = configService.get('defichain.dustUTXO', 0.001);
  }

  async verify(verify: VerifyObject, network: EnvironmentNetwork): Promise<VerifyResponse> {
    this.logger.log(`[Verify] ${verify.amount} ${verify.symbol} ${verify.address} ${verify.ethReceiverAddress}`);

    // Verify if the address is valid
    const { isAddressValid } = this.verifyValidAddress(verify.address, network);
    if (!isAddressValid) {
      return { isValid: false, statusCode: CustomErrorCodes.AddressNotValid };
    }

    // Verify if amount > 0
    if (new BigNumber(verify.amount).isLessThanOrEqualTo(0)) {
      return { isValid: false, statusCode: CustomErrorCodes.AmountNotValid };
    }

    // Verify if decimal places is maximum 5
    const dp = new BigNumber(verify.amount).dp();
    if (dp != null && dp > 5) {
      return { isValid: false, statusCode: CustomErrorCodes.AmountNotValid };
    }

    try {
      // Verify if token symbol is supported
      const supportedDfcTokens = this.configService.getOrThrow('defichain.supportedTokens');
      const supportedTokensArray = supportedDfcTokens.split(',') as Array<keyof typeof SupportedDFCTokenSymbols>;
      if (!supportedTokensArray.includes(verify.symbol)) {
        return { isValid: false, statusCode: CustomErrorCodes.TokenSymbolNotSupported };
      }

      const pathIndex = await this.prisma.deFiChainAddressIndex.findFirst({
        where: {
          address: verify.address,
        },
        orderBy: [{ index: 'desc' }],
      });

      // Address not found
      if (pathIndex === null) {
        return { isValid: false, statusCode: CustomErrorCodes.AddressNotFound };
      }

      // Verify that the address is owned by the wallet
      const wallet = this.whaleWalletProvider.createWallet(Number(pathIndex.index));
      const address = await wallet.getAddress();

      if (address !== verify.address) {
        return { isValid: false, statusCode: CustomErrorCodes.AddressNotOwned };
      }

      let utxo: string = '';
      let tokens: AddressToken[] = [];
      if (verify.symbol === TokenSymbol.DFI) {
        utxo = await wallet.client.address.getBalance(address);
      } else {
        tokens = await wallet.client.address.listToken(address);
      }
      const token = tokens.find((t) => t.symbol === verify.symbol.toString());

      // If no utxo has been received yet for DFI
      if (verify.symbol === TokenSymbol.DFI && new BigNumber(utxo).isZero()) {
        return { isValid: false, statusCode: CustomErrorCodes.IsZeroBalance };
      }

      // If no amount has been received yet for other tokens
      if ((token === undefined || new BigNumber(token?.amount).isZero()) && verify.symbol !== TokenSymbol.DFI) {
        return { isValid: false, statusCode: CustomErrorCodes.IsZeroBalance };
      }

      // Verify that the amount === utxo balance
      if (
        verify.symbol === TokenSymbol.DFI &&
        !new BigNumber(verify.amount).isEqualTo(utxo) &&
        !new BigNumber(verify.amount).plus(this.dustUTXO).isEqualTo(utxo)
      ) {
        return { isValid: false, statusCode: CustomErrorCodes.BalanceNotMatched };
      }

      // Verify that the amount === token balance
      if (token !== undefined && !new BigNumber(verify.amount).isEqualTo(token.amount)) {
        return { isValid: false, statusCode: CustomErrorCodes.BalanceNotMatched };
      }

      // Get and validate the number of confirmation blocks
      const blockTxnStatus = await this.validateBlockTxn(wallet, verify);
      if (blockTxnStatus.code !== undefined) {
        return {
          isValid: false,
          statusCode: blockTxnStatus.code,
          txnId: blockTxnStatus.txid,
        };
      }

      // Successful verification, proceed to sign the claim
      const fee = new BigNumber(verify.amount).multipliedBy(this.configService.getOrThrow('defichain.transferFee'));
      const amountLessFee = BigNumber.max(verify.amount.minus(fee), 0).toFixed(6, BigNumber.ROUND_FLOOR);

      const claim = await this.evmTransactionService.signClaim({
        receiverAddress: verify.ethReceiverAddress,
        tokenAddress: verify.tokenAddress,
        tokenSymbol: verify.symbol,
        amount: amountLessFee,
        uniqueDfcAddress: verify.address,
      });

      // Fund address once with dust UTXO
      if (!pathIndex.claimSignature) {
        await this.fundUTXO(verify.address);
      }

      this.logger.log(
        `[Verify SUCCESS] ${verify.amount} ${fee.toString()} ${amountLessFee} ${verify.symbol} ${verify.address} ${
          verify.ethReceiverAddress
        }`,
      );

      return {
        isValid: true,
        signature: claim.signature,
        nonce: claim.nonce,
        deadline: claim.deadline,
        txnId: blockTxnStatus.txid,
      };
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'There is a problem in verifying the address',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
        {
          cause: error as Error,
          description: `[Verify ERROR] ${verify.amount} ${verify.symbol} ${verify.address} ${verify.ethReceiverAddress}`,
        },
      );
    }
  }

  async generateAddress(
    refundAddress: string,
    network: EnvironmentNetwork,
  ): Promise<Pick<DeFiChainAddressIndex, 'address' | 'createdAt' | 'refundAddress'>> {
    try {
      this.logger.log(`[GA] ${refundAddress}`);
      const hotWallet = this.whaleWalletProvider.getHotWallet();
      const hotWalletAddress = await hotWallet.getAddress();
      const decodedAddress = fromAddress(refundAddress, this.clientProvider.remapNetwork(network));
      if (decodedAddress === undefined) {
        throw new BadRequestException(`Invalid refund address for DeFiChain ${network}`);
      }
      const lastIndex = await this.prisma.deFiChainAddressIndex.findFirst({
        where: {
          hotWalletAddress,
        },
        orderBy: [{ index: 'desc' }],
      });
      const index = lastIndex?.index;
      const nextIndex = index ? index + 1 : 2;
      const wallet = this.whaleWalletProvider.createWallet(nextIndex);
      const address = await wallet.getAddress();
      const data = await this.prisma.deFiChainAddressIndex.create({
        data: {
          index: nextIndex,
          address,
          refundAddress,
          hotWalletAddress,
        },
      });

      this.logger.log(`[GA SUCCESS] ${refundAddress} ${data.address} ${nextIndex}`);
      return {
        address: data.address,
        createdAt: data.createdAt,
        refundAddress: data.refundAddress,
      };
    } catch (e: any) {
      this.logger.error(`[GA ERROR] ${refundAddress} ${network}`, e);
      if (e instanceof BadRequestException) {
        throw e;
      }
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'There is a problem in generating an address',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
        {
          cause: e,
        },
      );
    }
  }

  async getAddressDetails(
    address: string,
  ): Promise<Pick<DeFiChainAddressIndex, 'address' | 'createdAt' | 'refundAddress'>> {
    try {
      const data = await this.prisma.deFiChainAddressIndex.findFirst({
        where: {
          address,
        },
        select: {
          address: true,
          refundAddress: true,
          createdAt: true,
        },
      });
      if (!data) {
        throw new Error('Address detail not available');
      }
      return data;
    } catch (e: any) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'There is a problem in fetching an address',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
        {
          cause: e,
        },
      );
    }
  }

  async getBalance(tokenSymbol: SupportedDFCTokenSymbols): Promise<string> {
    if (!SupportedDFCTokenSymbols[tokenSymbol]) {
      throw new BadRequestException(`Token: "${tokenSymbol}" is not supported`);
    }
    const hotWallet = await this.whaleWalletProvider.getHotWallet();
    const hotWalletAddress = await hotWallet.getAddress();
    const dfcReservedAmt = this.configService.getOrThrow('defichain.dfcReservedAmt', 0);

    if (tokenSymbol === SupportedDFCTokenSymbols.DFI) {
      const balance = await hotWallet.client.address.getBalance(hotWalletAddress);
      const DFIBalance = BigNumber.max(0, new BigNumber(balance).minus(dfcReservedAmt));
      return DFIBalance.toString();
    }

    const tokens = await hotWallet.client.address.listToken(hotWalletAddress);
    const token = tokens.find((t) => t.symbol === SupportedDFCTokenSymbols[tokenSymbol]);

    if (token === undefined) {
      return '0';
    }
    return token.amount;
  }

  private verifyValidAddress(address: string, network: EnvironmentNetwork): { isAddressValid: boolean } {
    const decodedAddress = fromAddress(address, getJellyfishNetwork(network).name);
    return { isAddressValid: decodedAddress !== undefined };
  }

  // This function will top up UTXO on a successful signing of DFC -> EVM claim
  private async fundUTXO(toAddress: string): Promise<void> {
    try {
      this.logger.log(`[Sending UTXO] to ${toAddress}...`);
      const sendTransactionHash = await this.sendService.send(toAddress, {
        symbol: 'DFI',
        id: '0',
        amount: new BigNumber(this.dustUTXO),
      });
      this.logger.log(`[Sent UTXO] to ${toAddress} ${sendTransactionHash}`);
    } catch (e) {
      this.logger.log(`[Sent UTXO] Failed to send ${toAddress}. Check UTXO balance.`);
    }
  }

  private async validateBlockTxn(wallet: WhaleWalletAccount, verify: VerifyObject) {
    const txInfo = await this.getDfcTxnConfirmations(wallet, verify);

    // Verify that user sent one transaction with exact amount needed
    if (txInfo === undefined) {
      return { code: CustomErrorCodes.TxnWithExactAmountNotFound, numberOfConfirmations: 0, txid: undefined };
    }
    const { numberOfConfirmations, txid } = txInfo;
    let statusCode: CustomErrorCodes | undefined;

    if (numberOfConfirmations < this.MIN_REQUIRED_DFC_CONFIRMATION) {
      // Verify that required number of confirmation block is reached
      statusCode = CustomErrorCodes.IsBelowMinConfirmationRequired;
    }

    return { code: statusCode, numberOfConfirmations, txid };
  }

  private async getDfcTxnConfirmations(
    wallet: WhaleWalletAccount,
    verify: VerifyObject,
  ): Promise<{ numberOfConfirmations: number; txid: string } | undefined> {
    try {
      const dfiTokenTxns = await wallet.client.address.listTransaction(verify.address);
      const otherTokensTxns = await wallet.client.address.listAccountHistory(verify.address);

      let txid: string;
      let txAmount: BigNumber;
      if (verify.symbol === TokenSymbol.DFI && dfiTokenTxns.length > 0) {
        // Find DFI txn with exact amount
        const transaction = dfiTokenTxns.find((tx) => verify.amount.isEqualTo(tx.value));
        if (transaction === undefined) {
          throw new Error(`No txn found with same amount needed (${verify.symbol}).`);
        }
        txid = transaction.txid;
        txAmount = new BigNumber(transaction.value);
      } else {
        // Find non-DFI token txn with exact amount
        const transaction = otherTokensTxns.find((tx) => {
          const txAmountSymbol = tx.amounts[0]?.split('@');
          const tokenSymbol = txAmountSymbol[1];
          return verify.amount.isEqualTo(txAmountSymbol[0]) && verify.symbol === tokenSymbol;
        });
        if (transaction === undefined) {
          throw new Error(`No txn found with same amount needed (${verify.symbol}).`);
        }
        txAmount = new BigNumber(transaction.amounts[0]?.split('@')[0]);
        txid = transaction.txid;
      }

      const { blockHash, blockHeight, numberOfConfirmations } = await this.deFiChainTransactionService.getTxn(txid);
      this.logger.log(
        `[DfcTxnConfirmations] info for txid ${txid}: ${txAmount} ${verify.symbol} ${blockHash} ${blockHeight} ${numberOfConfirmations}`,
      );

      return { numberOfConfirmations, txid };
    } catch (e: any) {
      this.logger.log(`[DfcTxnConfirmations ERROR] ${e.message}`);
      return undefined;
    }
  }
}

export interface VerifyResponse {
  isValid: boolean;
  statusCode?: CustomErrorCodes;
  signature?: string;
  nonce?: number;
  deadline?: number;
  txnId?: string;
}
