import { TicketService } from "../tickets.service.js";
import { Prisma, Ticket } from "@prisma/client";
import { ContactInternal } from "../../../providers/session.types.js";
import { VerifyMessage } from "../../messages/handlers/verifyMessage.js";
import { pendingMessagesQueue } from "../../../queues/pendingMessagesQueue.js";

interface CreateTicketInput {
  contato: string;
  contactOwner: ContactInternal;
  session: any;
  ticketGroup: boolean;
  msg: string;
  unreadMessages: number;
  isInteraction?: boolean;
  socketId?: string;
  chatClient?: boolean;
  /** Identificador aleatório do token autenticado do chat web. */
  chatSessionId?: string;
  status?: string;
  isFlow?: boolean;
  ObjMessage?: any;
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
const resolveOwnerName = (
  owner: ContactInternal,
  contato = "Desconhecido",
): string => owner.name || owner.pushname || owner.shortName || contato;

const mergeChatSessionMetadata = (
  metadata: unknown,
  chatSessionId: string | undefined,
): Prisma.InputJsonObject | undefined => {
  if (!chatSessionId) return undefined;

  const currentMetadata =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? (metadata as Prisma.InputJsonObject)
      : {};

  return {
    ...currentMetadata,
    chatSessionId,
  };
};

// 3. Monta os campos compartilhados entre create e update
const buildSharedFields = (input: CreateTicketInput, now: number) => ({
  unreadMessages: input.unreadMessages,
  lastMessage: input.msg,
  lastMessageAt: now,
  isInteraction: input.isInteraction,
  socketId: input.socketId,
  chatClient: input.chatClient,
  status: input.status,
  isFlow: input.isFlow,
});

export const createTicket = async (
  input: CreateTicketInput,
): Promise<{
  ticket: Ticket;
  isNew: boolean;
  isConcurrentMessage?: boolean;
}> => {
  const { session, contactOwner, contato, ticketGroup } = input;

  // 4. Timestamp único para ambos os payloads
  const now = Date.now();
  const sharedFields = buildSharedFields(input, now);
  const channelId = session.id;
  const createPayload: Prisma.TicketCreateInput = {
    ...sharedFields,
    owner: resolveOwnerName(contactOwner, contato),
    contato,
    isGroup: ticketGroup,
    channel: { connect: { id: channelId } },
    isFlow: !ticketGroup,
    isBot: !ticketGroup,
    metadata: mergeChatSessionMetadata(undefined, input.chatSessionId),
  };
  createPayload.queue = {
    connect: { id: process.env.BOT_QUEUE_ID },
  };
  // 5. O chat web só pode reutilizar um ticket pertencente à mesma sessão.
  const ticketWhere: Prisma.TicketWhereInput = {
    contato,
    status: { in: ["pending", "open"] },
    ...(input.chatSessionId
      ? {
          chatClient: true,
          metadata: {
            path: ["chatSessionId"],
            equals: input.chatSessionId,
          },
        }
      : {}),
  };
  const existingTicket = await ticketService.findTicket(ticketWhere);

  if (!existingTicket) {
    logger.info("Criando novo ticket");
    try {
      const ticket = await ticketService.createTicket(createPayload);
      return { ticket, isNew: true };
    } catch (error: any) {
      if (error.code === "P2002") {
        logger.warn("Ticket criado por outra requisição concorrente", {
          contato,
        });

        const ticket = await ticketService.findTicket(ticketWhere);

        if (!ticket) {
          throw error;
        }

        await VerifyMessage(input.ObjMessage, contactOwner, ticket.id, session);
        // await pendingMessagesQueue.add(
        //   "process-messages-queue",
        //   {
        //     ticketId: ticket.id,
        //     message: input.ObjMessage,
        //     contato: contactOwner,
        //     session: session,
        //   },
        //   {
        //     attempts: 3, // retenta até 3x em caso de falha
        //     backoff: {
        //       type: "exponential",
        //       delay: 5000,
        //     },
        //   },
        // );

        return {
          ticket,
          isNew: false,
          isConcurrentMessage: true,
        };
      }

      throw error;
    }
  }
  logger.info("Ticket já existente, atualizando", {
    ticketId: existingTicket.id,
  });
  const updateFields: Prisma.TicketUpdateInput = {
    ...sharedFields,
    ...(input.chatSessionId
      ? {
          metadata: mergeChatSessionMetadata(
            existingTicket.metadata,
            input.chatSessionId,
          ),
        }
      : {}),
  };
  const ticket = await ticketService.updateTicket(
    existingTicket.id,
    updateFields,
  );
  return { ticket, isNew: false };
};

export const updateTicket = async (
  ticketId: number,
  data: Prisma.TicketUpdateInput,
) => {
  await ticketService.updateTicket(ticketId, data);
};
