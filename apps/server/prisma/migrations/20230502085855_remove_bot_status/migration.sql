/*
  Warnings:

  - The values [FUNDED,REFUND_PROCESSED] on the enum `QueueStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `botTransactionHash` on the `AdminEthereumQueue` table. All the data in the column will be lost.
  - You are about to drop the column `generatedAddress` on the `AdminEthereumQueue` table. All the data in the column will be lost.
  - You are about to drop the column `hotWalletIndex` on the `AdminEthereumQueue` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "QueueStatus_new" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'ERROR', 'REJECTED', 'EXPIRED', 'REFUND_REQUESTED', 'REFUNDED');
ALTER TABLE "EthereumQueue" ALTER COLUMN "status" TYPE "QueueStatus_new" USING ("status"::text::"QueueStatus_new");
ALTER TYPE "QueueStatus" RENAME TO "QueueStatus_old";
ALTER TYPE "QueueStatus_new" RENAME TO "QueueStatus";
DROP TYPE "QueueStatus_old";
COMMIT;

-- DropIndex
DROP INDEX "AdminEthereumQueue_botTransactionHash_key";

-- DropIndex
DROP INDEX "AdminEthereumQueue_generatedAddress_key";

-- DropIndex
DROP INDEX "AdminEthereumQueue_hotWalletAddress_hotWalletIndex_key";

-- AlterTable
ALTER TABLE "AdminEthereumQueue" DROP COLUMN "botTransactionHash",
DROP COLUMN "generatedAddress",
DROP COLUMN "hotWalletIndex";
