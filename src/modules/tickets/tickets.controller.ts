import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { TicketService } from "./tickets.services";

export async function ticketController(fastify: FastifyInstance) {
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const service = new TicketService();
    const tickets = await service.listTickets();
    reply.status(200).send(tickets);
  });

  fastify.get(
    "/:ticketId",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { ticketId } = request.params as any;
      const numberTicket = parseInt(ticketId);
      const service = new TicketService();
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
      const status = request.body.status;
      const numberTicket = parseInt(ticketid);
      const service = new TicketService();
      console.log(status);
      // const ticket = await service.updateTicket(numberTicket, {
      //   status: request.body.status,
      // });
      // console.log(ticket);
      reply.status(200).send("Rota ainda não esta pronta");
    },
  );
}
