-- AlterTable
ALTER TABLE "BridgeEventTransactions" ADD COLUMN     "blockHash" TEXT,
ADD COLUMN     "blockHeight" TEXT,
ADD COLUMN     "unconfirmedSendTransactionHash" TEXT;
