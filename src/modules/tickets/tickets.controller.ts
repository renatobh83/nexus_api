import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { TicketService } from "./tickets.services.js";
const service = new TicketService();
export async function ticketController(fastify: FastifyInstance) {
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const tickets = await service.listTickets();

      reply.status(200).send(tickets);
    } catch (error) {
      reply
        .status(500)
        .send({ message: `Erro interno ${JSON.stringify(error, null, 2)}` });
    }
  });

  fastify.get(
    "/:ticketId",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { ticketId } = request.params as any;
        const numberTicket = parseInt(ticketId);
        const ticket = await service.findTicket({
          id: numberTicket,
        });
        reply
          .header("content-type", "application/json; charsert=utf8")
          .status(200)
          .send(ticket);
      } catch (error) {
        reply
          .status(500)
          .send({ message: `Erro interno ${JSON.stringify(error, null, 2)}` });
      }
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
      try {
        const { ticketid } = request.params as any;
        const status = request.body.status;
        const numberTicket = parseInt(ticketid);

        const ticket = await service.updateTicket(numberTicket, {
          status: status,
        });

        reply.status(200).send(ticket);
      } catch (error) {
        reply
          .status(500)
          .send({ message: `Erro interno ${JSON.stringify(error, null, 2)}` });
      }
    },
  );
}
