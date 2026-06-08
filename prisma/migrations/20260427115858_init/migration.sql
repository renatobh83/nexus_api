/*
  Warnings:

  - You are about to drop the column `channel` on the `Tickets` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Tickets" DROP COLUMN "channel",
ADD COLUMN     "isInteraction" BOOLEAN NOT NULL DEFAULT false;
