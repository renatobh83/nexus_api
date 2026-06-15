import { Worker, Job } from "bullmq";
import { redisConnection } from "../config/redis.js";
import { logger } from "../modules/tickets/Helpers/CreateTicket.js";
import { TicketService } from "../modules/tickets/tickets.service.js";
import { VerifyMessage } from "../modules/messages/handlers/verifyMessage.js";

const ticketService = new TicketService();
const pendingMessagesQueueWorker = new Worker(
  "process-messages-queue",
  async (job) => {
    const { ticketId, message, session, contato } = job.data;

    const ticket = await ticketService.findTicket({
      id: ticketId,
    });

    if (!ticket) {
      return;
    }

    await VerifyMessage(message, contato, ticket.id, session);
  },
  {
    connection: redisConnection,
    concurrency: 5,
  },
);

pendingMessagesQueueWorker.on("completed", (job) =>
  logger.info(`[pendingMessagesQueue] job ${job.id} concluído`),
);
pendingMessagesQueueWorker.on("failed", (job, err) =>
  logger.error(`[pendingMessagesQueue] job ${job?.id} falhou: ${err.message}`),
);
