-- CreateEnum
CREATE TYPE "enum_Messages_sendType" AS ENUM ('campaign', 'chat', 'external', 'schedule', 'bot', 'sync');

-- CreateTable
CREATE TABLE "Messages" (
    "id" UUID NOT NULL,
    "messageId" TEXT NOT NULL,
    "ack" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL,
    "wabaMediaId" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "fromMe" BOOLEAN NOT NULL DEFAULT false,
    "body" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "mediaType" TEXT,
    "reaction" TEXT,
    "reactionFromMe" TEXT,
    "timestamp" BIGINT,
    "scheduleDate" TIMESTAMP(3),
    "sendType" "enum_Messages_sendType" NOT NULL DEFAULT 'chat',
    "idFront" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "isForwarded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ticketid" INTEGER,

    CONSTRAINT "Messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Messages_messageId_key" ON "Messages"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "Messages_messageId_ticketid_key" ON "Messages"("messageId", "ticketid");

-- AddForeignKey
ALTER TABLE "Messages" ADD CONSTRAINT "Messages_ticketid_fkey" FOREIGN KEY ("ticketid") REFERENCES "Tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
