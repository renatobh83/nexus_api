/*
  Warnings:

  - The `timestamp` column on the `Messages` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Messages" DROP COLUMN "timestamp",
ADD COLUMN     "timestamp" BIGINT;
