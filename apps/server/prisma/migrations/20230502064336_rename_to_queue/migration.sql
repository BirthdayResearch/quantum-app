/*
  Warnings:

  - You are about to drop the `AdminEthereumOrders` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EthereumOrders` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "QueueStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'FUNDED', 'COMPLETED', 'ERROR', 'REJECTED', 'EXPIRED', 'REFUND_REQUESTED', 'REFUND_PROCESSED', 'REFUNDED');

-- DropForeignKey
ALTER TABLE "AdminEthereumOrders" DROP CONSTRAINT "AdminEthereumOrders_orderId_fkey";

-- DropTable
DROP TABLE "AdminEthereumOrders";

-- DropTable
DROP TABLE "EthereumOrders";

-- DropEnum
DROP TYPE "OrderStatus";

-- CreateTable
CREATE TABLE "EthereumQueue" (
    "id" BIGSERIAL NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "ethereumStatus" "EthereumTransactionStatus" NOT NULL,
    "status" "QueueStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "amount" TEXT,
    "tokenSymbol" TEXT,
    "defichainAddress" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EthereumQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminEthereumQueue" (
    "id" BIGSERIAL NOT NULL,
    "queueTransactionHash" TEXT NOT NULL,
    "lastUpdatedBy" TEXT,
    "hotWalletAddress" TEXT,
    "hotWalletIndex" INTEGER,
    "generatedAddress" TEXT,
    "sendTransactionHash" TEXT,
    "defichainStatus" "DeFiChainTransactionStatus" NOT NULL,
    "hasVerified" BOOLEAN,
    "blockHash" TEXT,
    "blockHeight" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "botTransactionHash" TEXT,

    CONSTRAINT "AdminEthereumQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EthereumQueue_transactionHash_key" ON "EthereumQueue"("transactionHash");

-- CreateIndex
CREATE UNIQUE INDEX "AdminEthereumQueue_queueTransactionHash_key" ON "AdminEthereumQueue"("queueTransactionHash");

-- CreateIndex
CREATE UNIQUE INDEX "AdminEthereumQueue_generatedAddress_key" ON "AdminEthereumQueue"("generatedAddress");

-- CreateIndex
CREATE UNIQUE INDEX "AdminEthereumQueue_sendTransactionHash_key" ON "AdminEthereumQueue"("sendTransactionHash");

-- CreateIndex
CREATE UNIQUE INDEX "AdminEthereumQueue_botTransactionHash_key" ON "AdminEthereumQueue"("botTransactionHash");

-- CreateIndex
CREATE UNIQUE INDEX "AdminEthereumQueue_hotWalletAddress_hotWalletIndex_key" ON "AdminEthereumQueue"("hotWalletAddress", "hotWalletIndex");

-- AddForeignKey
ALTER TABLE "AdminEthereumQueue" ADD CONSTRAINT "AdminEthereumQueue_queueTransactionHash_fkey" FOREIGN KEY ("queueTransactionHash") REFERENCES "EthereumQueue"("transactionHash") ON DELETE RESTRICT ON UPDATE CASCADE;
