-- CreateEnum
CREATE TYPE "EthereumTransactionStatus" AS ENUM ('NOT_CONFIRMED', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "BotStatus" AS ENUM ('COMPLETE', 'CANNOT_COMPLETE', 'TOKEN_NOT_FOUND', 'NO_UTXO', 'SENT', 'ERROR');

-- CreateTable
CREATE TABLE "DeFiChainAddressIndex" (
    "id" BIGSERIAL NOT NULL,
    "index" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "refundAddress" TEXT NOT NULL,
    "claimNonce" TEXT,
    "claimDeadline" TEXT,
    "claimSignature" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "hotWalletAddress" TEXT NOT NULL,
    "ethReceiverAddress" TEXT,
    "botStatus" "BotStatus",

    CONSTRAINT "DeFiChainAddressIndex_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BridgeEventTransactions" (
    "id" BIGSERIAL NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "status" "EthereumTransactionStatus" NOT NULL,
    "sendTransactionHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "BridgeEventTransactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeFiChainAddressIndex_address_key" ON "DeFiChainAddressIndex"("address");

-- CreateIndex
CREATE UNIQUE INDEX "DeFiChainAddressIndex_hotWalletAddress_index_key" ON "DeFiChainAddressIndex"("hotWalletAddress", "index");

-- CreateIndex
CREATE UNIQUE INDEX "BridgeEventTransactions_transactionHash_key" ON "BridgeEventTransactions"("transactionHash");

