/*
  Warnings:

  - You are about to drop the column `ower` on the `Tickets` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Tickets" DROP COLUMN "ower",
ADD COLUMN     "owner" TEXT;
