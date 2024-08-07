import { EthereumTransactionStatus, QueueStatus } from '@prisma/client';

export interface Queue {
  id: string;
  transactionHash: string;
  ethereumStatus: EthereumTransactionStatus;
  status: QueueStatus;
  createdAt: Date;
  updatedAt: Date | null;
  amount: string | null;
  tokenSymbol: string | null;
  defichainAddress: string;
  expiryDate: Date;
  adminQueue?: null | {
    sendTransactionHash: string | null;
  };
}

export enum OrderBy {
  ASC = 'ASC',
  DESC = 'DESC',
}

export interface VerifyQueueTransactionDto {
  numberOfConfirmations: number;
  isConfirmed: boolean;
}
