/*
  Warnings:

  - Added the required column `ticketId` to the `FlowExecution` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FlowExecution" ADD COLUMN     "ticketId" TEXT NOT NULL;
