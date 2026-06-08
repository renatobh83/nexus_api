-- DropForeignKey
ALTER TABLE "Messages" DROP CONSTRAINT "Messages_ticketid_fkey";

-- AddForeignKey
ALTER TABLE "Messages" ADD CONSTRAINT "Messages_ticketid_fkey" FOREIGN KEY ("ticketid") REFERENCES "Tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
