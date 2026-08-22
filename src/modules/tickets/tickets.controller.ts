import { Prisma } from "@prisma/client";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { TicketService } from "./tickets.service.js";
import {
  canAccessTicket,
  getAuthenticatedSubject,
  isAdministrator,
} from "../auth/authorization.js";
import {
  parseTicketId,
  parseTicketStatus,
  parseTicketUpdateBody,
} from "./ticket.security.js";
import {
  FLOW_PERMISSIONS,
  canUseFlowRoute,
} from "../auth/flowAuthorization.js";

const service = new TicketService();

type TicketParams = { ticketId: string };
type LegacyTicketParams = { ticketid: string };
type TicketUpdateBody = { id?: unknown; status?: unknown };

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
    async (
      request: FastifyRequest<{ Params: TicketParams }>,
      reply: FastifyReply,
    ) => {
      const ticketId = parseTicketId(request.params.ticketId);

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
    {
      config: {
        flowPermission: FLOW_PERMISSIONS.UPDATE_TICKET,
      },
    },
    async (
      request: FastifyRequest<{
        Params: LegacyTicketParams;
        Body: TicketUpdateBody;
      }>,
      reply: FastifyReply,
    ) => {
      const ticketId = parseTicketId(request.params.ticketid);
      const status = parseTicketStatus(request.body?.status);

      if (!ticketId || !status) {
        return reply.status(400).send({ message: "Invalid ticket update" });
      }

      const currentTicket = await service.findTickeWhitoutMessage({
        id: ticketId,
      });
      if (!currentTicket) {
        return reply.status(404).send({ message: "Ticket not found" });
      }

      const flowAuthorized = canUseFlowRoute(
        request.user,
        request.isInternalFlow,
        request.routeOptions?.config,
      );

      if (!flowAuthorized && !canAccessTicket(request.user, currentTicket)) {
        return reply.status(403).send({ message: "Insufficient permissions" });
      }

      const ticket = await service.updateTicket(ticketId, { status });
      return reply.status(200).send(ticket);
    },
  );

  fastify.put(
    "/:ticketid",
    async (
      request: FastifyRequest<{
        Params: LegacyTicketParams;
        Body: TicketUpdateBody;
      }>,
      reply: FastifyReply,
    ) => {
      const ticketId = parseTicketId(request.params.ticketid);
      const parsedBody = parseTicketUpdateBody(request.body);

      if (!ticketId || !parsedBody) {
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
      const assignedUserId = isAdministrator(request.user)
        ? parsedBody.assignedUserId
        : subject;

      const dataForUpdate: Prisma.TicketUpdateInput = {
        status: parsedBody.status,
      };

      if (parsedBody.status !== "pending") {
        if (!assignedUserId) {
          return reply.status(401).send({ message: "Invalid authenticated user" });
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
