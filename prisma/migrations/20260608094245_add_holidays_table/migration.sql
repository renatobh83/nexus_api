/*
  Warnings:

  - You are about to drop the column `chatFlowStatus` on the `Tickets` table. All the data in the column will be lost.
  - You are about to drop the column `stepChatFlow` on the `Tickets` table. All the data in the column will be lost.
  - Added the required column `moduleName` to the `FlowExecution` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FlowExecution" ADD COLUMN     "moduleName" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Tickets" DROP COLUMN "chatFlowStatus",
DROP COLUMN "stepChatFlow",
ADD COLUMN     "isFlow" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ServiceHours" (
    "id" TEXT NOT NULL,
    "queueId" TEXT,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',

    CONSTRAINT "ServiceHours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "queueId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Queue" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hasHuman" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Queue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceHours_queueId_dayOfWeek_key" ON "ServiceHours"("queueId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "Holiday_date_queueId_key" ON "Holiday"("date", "queueId");

-- AddForeignKey
ALTER TABLE "ServiceHours" ADD CONSTRAINT "ServiceHours_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "Queue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "Queue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
