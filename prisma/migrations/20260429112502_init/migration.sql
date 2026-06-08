/*
  Warnings:

  - Added the required column `content` to the `Messages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mimetype` to the `Messages` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Messages" ADD COLUMN     "caption" TEXT,
ADD COLUMN     "chatId" TEXT,
ADD COLUMN     "content" TEXT NOT NULL,
ADD COLUMN     "mimetype" TEXT NOT NULL,
ALTER COLUMN "body" DROP NOT NULL;
