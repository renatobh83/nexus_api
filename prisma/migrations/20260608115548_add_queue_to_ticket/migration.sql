-- AlterTable
ALTER TABLE "Tickets" ADD COLUMN     "isBot" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "queueId" TEXT;

-- AddForeignKey
ALTER TABLE "Tickets" ADD CONSTRAINT "Tickets_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "Queue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
