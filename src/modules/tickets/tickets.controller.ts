import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { TicketService } from "./tickets.service.js";
const service = new TicketService();
export async function ticketController(fastify: FastifyInstance) {
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const tickets = await service.listTickets();

    reply.status(200).send(tickets);
  });

  fastify.get(
    "/:ticketId",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { ticketId } = request.params as any;
      const numberTicket = parseInt(ticketId);
      const ticket = await service.findTicket({
        id: numberTicket,
      });
      reply
        .header("content-type", "application/json; charsert=utf8")
        .status(200)
        .send(ticket);
    },
  );
  fastify.put(
    "/:ticketid",
    async (
      request: FastifyRequest<{
        Body: {
          status: string;
        };
      }>,
      reply: FastifyReply,
    ) => {
      const { ticketid } = request.params as any;
      const { id, status } = request.body as any;
      const numberTicket = parseInt(ticketid);

      const dataForUpdate: any = {
        status,
      };
      if (status !== "pending") {
        dataForUpdate.user = {
          connect: { id: id },
        };
      } else {
        dataForUpdate.user = {
          disconnect: true,
        };
      }

      const ticket = await service.updateTicket(numberTicket, dataForUpdate);

      reply.status(200).send(ticket);
    },
  );
}
