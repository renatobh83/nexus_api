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
  fastify.post("/", async (request: FastifyRequest, reply: FastifyReply) => {
    // const { ticketId } = request.params as any;
    // const numberTicket = parseInt(ticketId);
    // const service = new TicketService();
    // const ticket = await service.findTicket({
    //   id: numberTicket,
    // });
    reply.status(200).send("Rota ainda não esta pronta");
  });
}
