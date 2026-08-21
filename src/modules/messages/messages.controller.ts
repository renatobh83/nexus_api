import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { MessageService } from "./messages.service.js";
import { TicketService } from "../tickets/tickets.service.js";
import { canAccessTicket } from "../auth/authorization.js";
import { readMultipartParts } from "../../utils/readMultipart.js";
const service = new MessageService();
const ticketServices = new TicketService();
const DEFAULT_MESSAGE_LIMIT = 40;
const MAX_MESSAGE_LIMIT = 100;

/** Converte um identificador de rota em inteiro positivo sem aceitar prefixos inválidos. */
function parseTicketId(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function parsePaginationInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum?: number,
): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum) return fallback;
  return maximum === undefined ? parsed : Math.min(parsed, maximum);
}
export async function messagesController(fastify: FastifyInstance) {
  fastify.get(
    "/:ticketId",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { ticketId } = request.params as any;
      const numberTicket = parseTicketId(ticketId);
      if (!numberTicket) {
        return reply.status(400).send({ message: "Invalid ticket id" });
      }

      const ticket = await ticketServices.findTickeWhitoutMessage({
        id: numberTicket,
      });
      if (!ticket) {
        return reply.status(404).send({ message: "Ticket not found" });
      }

      if (!canAccessTicket(request.user, ticket)) {
        return reply.status(403).send({ message: "Insufficient permissions" });
      }

      const query = request.query as {
        limit?: string;
        skip?: string;
      };
      const limit = parsePaginationInteger(
        query?.limit,
        DEFAULT_MESSAGE_LIMIT,
        1,
        MAX_MESSAGE_LIMIT,
      );
      const skip = parsePaginationInteger(query?.skip, 0, 0);
      const { count, hasMore, messages } = await service.findMessagesTicket(
        { ticketid: numberTicket },
        { limit, skip },
      );

      reply.status(200).send({ count, hasMore, limit, skip, messages });
    },
  );
  fastify.post(
    "/:ticketId",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { ticketId } = request.params as any;
      const numberTicket = parseTicketId(ticketId);
      if (!numberTicket) {
        return reply.status(400).send({ message: "Invalid ticket id" });
      }

      const ticket = await ticketServices.findTickeWhitoutMessage({
        id: numberTicket,
      });
      if (!ticket) {
        throw new Error("TICKET_NO_FOUND");
      }

      if (!canAccessTicket(request.user, ticket)) {
        return reply.status(403).send({ message: "Insufficient permissions" });
      }

      let filesArray: Array<{
        filename: string;
        mimetype: string;
        buffer: Buffer;
      }> = [];
      let fields: Record<string, any> = {};

      if (request.isMultipart()) {
        const parsedParts = await readMultipartParts(request.parts());
        filesArray = parsedParts.files;
        fields = parsedParts.fields;
      } else {
        fields = request.body as any;
      }
      const messageData = {
        message: fields,
        filesArray,
        ticket,
      };

      const messageSent = await service.createMessageSystem(messageData);

      reply.status(200).send(messageSent);
    },
  );
}
