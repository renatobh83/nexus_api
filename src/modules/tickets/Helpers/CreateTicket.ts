import { Contact } from "wbotconnect";
import { Prisma, Ticket } from "../../../generated/prisma/client";
import { TicketService } from "../tickets.services";

export const createTicket = async (
  contato: string,
  contactOwer: Contact,
  channelId: number,
  ticketGroup: boolean,
  msg: string,
  unreadMessages: number,
  isInteraction?: boolean,
  socketId?: string,
  chatClient?: boolean,
): Promise<{ ticket: any; isNew: boolean }> => {
  let ticket: Ticket | null;

  const payload: Prisma.TicketCreateInput = {
    ower: contactOwer.pushname || contactOwer.name || contactOwer.shortName,
    contato,
    unreadMessages,
    lastMessage: msg,
    lastMessageAt: Date.now(),
    isGroup: ticketGroup,
    isInteraction,
    socketId,
    chatClient,
  };

  payload.channel = {
    connect: { id: channelId },
  };

  // Payload para atualização (apenas os campos que podem mudar)
  const updatePayload: Prisma.TicketUpdateInput = {
    unreadMessages,
    lastMessage: msg,
    lastMessageAt: Date.now(),
    isInteraction,
    socketId,
    chatClient,
  };

  const service = new TicketService();
  ticket = await service.findTicket({
    contato: contato,
    status: {
      in: ["pending", "open"],
    },
  });
  if (!ticket) {
    ticket = await service.createTicket(payload);
    return { ticket: ticket, isNew: true };
  } else {
    ticket = await service.updateTicket(ticket.id, updatePayload);
    return { ticket: ticket, isNew: false };
  }
};
