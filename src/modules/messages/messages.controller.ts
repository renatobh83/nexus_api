import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { MessageService } from "./messages.service";
import { TicketService } from "../tickets/tickets.services";

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
  fastify.post(
    "/:ticketId",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { ticketId } = request.params as any;
      const numberTicket = parseInt(ticketId);
      const ticketServices = new TicketService();
      const ticket = await ticketServices.findTicket({ id: numberTicket });
      if (!ticket) {
        throw new Error("TICKET_NO_FOUND");
      }
      let filesArray: any[] = [];
      let fields: Record<string, any> = {};

      if (request.isMultipart()) {
        const parts = request.parts();

        for await (const part of parts) {
          if (part.type === "file") {
            const buffer = await part.toBuffer();
            filesArray.push({
              filename: part.filename,
              mimetype: part.mimetype,
              buffer,
            });
          } else {
            fields[part.fieldname] = part.value;
          }
        }
      } else {
        fields = request.body as any;
      }
      const messageData = {
        message: fields,
        filesArray,
        ticket,
      };
      console.log(messageData);
      const service = new MessageService();
      service.createMessageSystem(messageData);
    },
  );
}
