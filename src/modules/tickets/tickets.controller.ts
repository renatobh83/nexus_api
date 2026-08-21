import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { TicketService } from "./tickets.service.js";
import {
  canAccessTicket,
  getAuthenticatedSubject,
  isAdministrator,
} from "../auth/authorization.js";

const service = new TicketService();

function parseTicketId(value: unknown): number | undefined {
  const ticketId = Number(value);
  return Number.isInteger(ticketId) && ticketId > 0 ? ticketId : undefined;
}

export async function ticketController(fastify: FastifyInstance) {
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const claims = request.user;

    if (isAdministrator(claims)) {
      const tickets = await service.listTickets();
      return reply.status(200).send(tickets);
    }

    const subject = getAuthenticatedSubject(claims);
    if (!subject) {
      return reply.status(401).send({ message: "Invalid authenticated user" });
    }

    const tickets = await service.listTickets({
      OR: [{ status: "pending" }, { userId: subject }],
    });

    return reply.status(200).send(tickets);
  });

  fastify.get(
    "/:ticketId",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const ticketId = parseTicketId((request.params as any).ticketId);

      if (!ticketId) {
        return reply.status(400).send({ message: "Invalid ticket id" });
      }

      const ticket = await service.findTicket({ id: ticketId });
      if (!ticket) {
        return reply.status(404).send({ message: "Ticket not found" });
      }

      if (!canAccessTicket(request.user, ticket)) {
        return reply.status(403).send({ message: "Insufficient permissions" });
      }

      return reply
        .header("content-type", "application/json; charset=utf-8")
        .status(200)
        .send(ticket);
    },
  );

  fastify.put(
    "/:ticketid/flow",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const ticketId = parseTicketId((request.params as any).ticketid);
      const { status } = (request.body as any) || {};

      if (!ticketId || typeof status !== "string" || !status.trim()) {
        return reply.status(400).send({ message: "Invalid ticket update" });
      }

      const currentTicket = await service.findTickeWhitoutMessage({
        id: ticketId,
      });
      if (!currentTicket) {
        return reply.status(404).send({ message: "Ticket not found" });
      }

      if (!canAccessTicket(request.user, currentTicket)) {
        return reply.status(403).send({ message: "Insufficient permissions" });
      }

      const ticket = await service.updateTicket(ticketId, { status });
      return reply.status(200).send(ticket);
    },
  );

  fastify.put(
    "/:ticketid",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const ticketId = parseTicketId((request.params as any).ticketid);
      const body = (request.body as any) || {};
      const { id, status } = body;

      if (!ticketId || typeof status !== "string" || !status.trim()) {
        return reply.status(400).send({ message: "Invalid ticket update" });
      }

      const currentTicket = await service.findTickeWhitoutMessage({
        id: ticketId,
      });
      if (!currentTicket) {
        return reply.status(404).send({ message: "Ticket not found" });
      }

      if (!canAccessTicket(request.user, currentTicket)) {
        return reply.status(403).send({ message: "Insufficient permissions" });
      }

      const subject = getAuthenticatedSubject(request.user);
      const assignedUserId = isAdministrator(request.user) ? id : subject;

      const dataForUpdate: any = { status };
      if (status !== "pending") {
        if (assignedUserId === undefined || assignedUserId === null) {
          return reply
            .status(401)
            .send({ message: "Invalid authenticated user" });
        }

        dataForUpdate.user = {
          connect: { id: assignedUserId },
        };
      } else {
        dataForUpdate.user = {
          disconnect: true,
        };
      }

      const ticket = await service.updateTicket(ticketId, dataForUpdate);
      return reply.status(200).send(ticket);
    },
  );
}
