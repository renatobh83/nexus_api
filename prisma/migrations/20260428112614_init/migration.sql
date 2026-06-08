/*
  Warnings:

  - Made the column `contato` on table `Tickets` required. This step will fail if there are existing NULL values in that column.
  - Made the column `channelId` on table `Tickets` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Tickets" DROP CONSTRAINT "Tickets_channelId_fkey";

-- AlterTable
ALTER TABLE "Tickets" ADD COLUMN     "ower" TEXT,
ALTER COLUMN "contato" SET NOT NULL,
ALTER COLUMN "channelId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Tickets" ADD CONSTRAINT "Tickets_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
