import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { MessageService } from "./messages.service.js";
import { TicketService } from "../tickets/tickets.services.js";
const service = new MessageService();
const ticketServices = new TicketService();
export async function messagesController(fastify: FastifyInstance) {
  fastify.get(
    "/:ticketId",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { ticketId } = request.params as any;
        const numberTicket = parseInt(ticketId);
        const { count, hasMore, messages } = await service.findMessagesTicket({
          ticketid: numberTicket,
        });

        reply.status(200).send({ count, hasMore, messages });
      } catch (error) {
        reply
          .status(500)
          .send({ message: `Erro interno ${JSON.stringify(error, null, 2)}` });
      }
    },
  );
  fastify.post(
    "/:ticketId",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { ticketId } = request.params as any;
        const numberTicket = parseInt(ticketId);

        const ticket = await ticketServices.findTickeWhitoutMessage({
          id: numberTicket,
        });
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
        await service.createMessageSystem(messageData);

        reply.status(200).send("Messagem enviada");
      } catch (error) {
        reply
          .status(500)
          .send({ message: `Erro interno ${JSON.stringify(error, null, 2)}` });
      }
    },
  );
}
