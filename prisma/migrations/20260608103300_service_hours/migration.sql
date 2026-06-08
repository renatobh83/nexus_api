/*
  Warnings:

  - A unique constraint covering the columns `[dayOfWeek,queueId]` on the table `ServiceHours` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ServiceHours_queueId_dayOfWeek_key";

-- CreateIndex
CREATE UNIQUE INDEX "ServiceHours_dayOfWeek_queueId_key" ON "ServiceHours"("dayOfWeek", "queueId");
