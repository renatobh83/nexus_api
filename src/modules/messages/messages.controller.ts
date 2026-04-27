import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { MessageService } from "./messages.service";

export async function messagesController(fastify: FastifyInstance) {
  fastify.get(
    "/:ticketId",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { ticketId } = request.params as any;
      const numberTicket = parseInt(ticketId);
      const service = new MessageService();
      const { count, hasMore, messages } = await service.findMessagesTicket({
        ticketid: numberTicket,
      });

      reply.status(200).send({ count, hasMore, messages });
    },
  );
}
