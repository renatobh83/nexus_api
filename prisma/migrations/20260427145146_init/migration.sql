/*
  Warnings:

  - Added the required column `contato` to the `Messages` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Messages" ADD COLUMN     "contato" TEXT NOT NULL;
