-- CreateTable
CREATE TABLE "Channel" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "session" TEXT,
    "qrcode" TEXT,
    "status" TEXT,
    "battery" TEXT,
    "plugged" BOOLEAN,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "retries" INTEGER DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "tokenTelegram" TEXT,
    "type" TEXT NOT NULL DEFAULT 'whatsapp',
    "number" TEXT,
    "wppUser" TEXT,
    "pairingCodeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "pairingCode" TEXT,
    "phone" JSONB,
    "wabaBSP" TEXT,
    "tokenAPI" TEXT,
    "tokenHook" TEXT,
    "farewellMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tickets" (
    "id" SERIAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "unreadMessages" INTEGER,
    "lastMessage" TEXT,
    "channel" TEXT,
    "answered" BOOLEAN NOT NULL DEFAULT true,
    "isGroup" BOOLEAN NOT NULL DEFAULT false,
    "associatedCalls" BOOLEAN NOT NULL DEFAULT false,
    "isActiveDemand" BOOLEAN NOT NULL DEFAULT false,
    "isFarewellMessage" BOOLEAN NOT NULL DEFAULT false,
    "sendWelcomeFlow" BOOLEAN NOT NULL DEFAULT true,
    "isTransference" BOOLEAN NOT NULL DEFAULT false,
    "lastInteractionBot" TIMESTAMP(3),
    "botRetries" INTEGER,
    "closedAt" BIGINT,
    "lastMessageAt" BIGINT,
    "startedAttendanceAt" BIGINT,
    "chamadoId" BIGINT,
    "lastAbsenceMessageAt" TIMESTAMP(3),
    "chatClient" BOOLEAN,
    "socketId" TEXT,
    "stepChatFlow" TEXT,
    "chatFlowStatus" TEXT NOT NULL DEFAULT 'not_started',
    "apiConfig" JSONB,
    "contato" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "channelId" INTEGER,

    CONSTRAINT "Tickets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Channel_name_key" ON "Channel"("name");

-- AddForeignKey
ALTER TABLE "Tickets" ADD CONSTRAINT "Tickets_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
