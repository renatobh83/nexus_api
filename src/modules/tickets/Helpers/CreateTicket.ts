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
  status?: string
  isFlow?: boolean

}

//  Logger
export const logger = {
  info: (msg: string, meta?: Record<string, unknown>) =>
    console.info(`[INFO] ${msg}`, meta ?? ""),
  warn: (msg: string, meta?: Record<string, unknown>) =>
    console.warn(`[WARN] ${msg}`, meta ?? ""),
  error: (msg: string, meta?: Record<string, unknown>) =>
    console.error(`[ERROR] ${msg}`, meta ?? ""),
};

// 1. Singleton do service (evita instanciar a cada chamada)
const ticketService = new TicketService();

// 2. Utilitário para resolver o nome do contato
const resolveOwnerName = (owner: ContactInternal): string =>
  owner.name || owner.pushname || owner.shortName || "Desconhecido";

// 3. Monta os campos compartilhados entre create e update
const buildSharedFields = (input: CreateTicketInput, now: number) => ({
  unreadMessages: input.unreadMessages,
  lastMessage: input.msg,
  lastMessageAt: now,
  isInteraction: input.isInteraction,
  socketId: input.socketId,
  chatClient: input.chatClient,
  status: input.status,
  isFlow: input.isFlow
});

export const createTicket = async (
  input: CreateTicketInput,
): Promise<{ ticket: Ticket; isNew: boolean }> => {
  
  const { channelId, contactOwner, contato, ticketGroup } = input;

  // 4. Timestamp único para ambos os payloads
  const now = Date.now();
  const sharedFields = buildSharedFields(input, now);

  const createPayload: Prisma.TicketCreateInput = {
    ...sharedFields,
    owner: resolveOwnerName(contactOwner),
    contato,
    isGroup: ticketGroup,
    channel: { connect: { id: channelId } },
    isFlow: true
  };

  // 5. Usando upsert do Prisma em vez de find → create/update manual
  const existingTicket = await ticketService.findTicket({
    contato,
    status: { in: ["pending", "open"] },
  });

  if (!existingTicket) {
    logger.info("Criando novo ticket");
    const ticket = await ticketService.createTicket(createPayload);
    return { ticket, isNew: true };
  }
  logger.info("Ticket já existente, atualizando", {
    ticketId: existingTicket.id,
  });
  const ticket = await ticketService.updateTicket(
    existingTicket.id,
    sharedFields,
  );
  return { ticket, isNew: false };
};
