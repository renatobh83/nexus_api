// queues/ticketIntegration.queue.ts
import { Queue } from "bullmq";
import { redisConnection } from "../config/redis.js";
import { TicketResponseStatus } from "../modules/externals/Helpers/checkIntegration.js";
import { Ticket } from "@prisma/client";

export interface TicketIntegrationJobData {
  ticket: Ticket; // seu tipo real
  status: TicketResponseStatus;
  rawResponse: string | number;
}

export const ticketIntegrationQueue = new Queue<TicketIntegrationJobData>(
  "ticket-integration",
  { connection: redisConnection },
);
