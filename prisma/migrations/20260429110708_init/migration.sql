/*
  Warnings:

  - You are about to drop the column `status` on the `Messages` table. All the data in the column will be lost.
  - You are about to drop the column `wabaMediaId` on the `Messages` table. All the data in the column will be lost.
  - Added the required column `to` to the `Messages` table without a default value. This is not possible if the table is not empty.
  - Made the column `ticketid` on table `Messages` required. This step will fail if there are existing NULL values in that column.
  - Made the column `timestamp` on table `Messages` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "enum_MessageType" AS ENUM ('notification', 'notification_template', 'group_notification', 'gp2', 'broadcast_notification', 'e2e_notification', 'call_log', 'protocol', 'chat', 'location', 'payment', 'vcard', 'ciphertext', 'multi_vcard', 'revoked', 'oversized', 'groups_v4_invite', 'hsm', 'template_button_reply', 'image', 'video', 'audio', 'ptt', 'sticker', 'document', 'product', 'order', 'list', 'list_response', 'buttons_response', 'poll_creation', 'unknown');

-- DropForeignKey
ALTER TABLE "Messages" DROP CONSTRAINT "Messages_ticketid_fkey";

-- AlterTable
ALTER TABLE "Messages" DROP COLUMN "status",
DROP COLUMN "wabaMediaId",
ADD COLUMN     "from" TEXT,
ADD COLUMN     "hasReaction" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isGroupMsg" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isNotification" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "to" TEXT NOT NULL,
ADD COLUMN     "type" "enum_MessageType" NOT NULL DEFAULT 'chat',
ALTER COLUMN "ticketid" SET NOT NULL,
ALTER COLUMN "timestamp" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Messages" ADD CONSTRAINT "Messages_ticketid_fkey" FOREIGN KEY ("ticketid") REFERENCES "Tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
