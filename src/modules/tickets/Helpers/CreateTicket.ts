import { TicketService } from "../tickets.service.js";
import { Prisma, Ticket } from "@prisma/client";
import { ContactInternal } from "../../../providers/session.types.js";

interface CreateTicketInput {
  contato: string;
  contactOwner: ContactInternal;
  channelId: number;
  ticketGroup: boolean;
  msg: string;
  unreadMessages: number;
  isInteraction?: boolean;
  socketId?: string;
  chatClient?: boolean;
}

export const createTicket = async (
  input: CreateTicketInput,
): Promise<{ ticket: Ticket; isNew: boolean }> => {
  let ticket: Ticket | null;
  const {
    channelId,
    contactOwner,
    contato,
    msg,
    ticketGroup,
    unreadMessages,
    chatClient,
    isInteraction,
    socketId,
  } = input;

  const payload: Prisma.TicketCreateInput = {
    owner: contactOwner.name || contactOwner.pushname || contactOwner.shortName,
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
