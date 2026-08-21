import { MessageInternal } from "../messages.types.js";

import { Message, Prisma } from "@prisma/client";
import { MessageService } from "../messages.service.js";
import {
  ContactInternal,
  SessionInternal,
} from "../../../providers/session.types.js";

const messageService = new MessageService();

/**
 * Constrói os campos da mensagem sem incluir a relação com o ticket.
 * A relação é adicionada pelo chamador que conhece o contexto da transação.
 */
export const buildMessageData = async (
  message: MessageInternal,
  contato: ContactInternal,
  session: SessionInternal,
): Promise<Prisma.MessageCreateWithoutTicketInput> => {
  const body =
    message.type === "list"
      ? "message.list.description"
      : message.content || message.body;

  const media =
    message.type !== "chat" ? await session.downloadMedia(message) : "";

  return {
    messageId: message.messageId,
    body: message.type === "chat" ? body : message.caption || media,
    ack: message.ack,
    timestamp: message.timestamp,
    mediaUrl: message.type === "chat" ? "" : media,
    read: message.fromMe,
    mediaType: message.type === "chat" ? "" : message.mimetype,
    sendType: "chat",
    isGroupMsg: message.isGroupMsg,
    caption: message.body || message.caption,
    from: message.from,
    hasReaction: message.hasReaction,
    fromMe: message.fromMe,
    contato: contato.formattedName || contato.name,
    type: message.type,
    sender: message.sender,
    to: message.to,
    content:
      message.type === "chat" ? message.content : message.caption || media,
    mimetype: message.mimetype,
    quotedMsgId: message.quotedMsgId,
  };
};

/**
 * Notifica uma mensagem após uma transação concluída, sem fazer nova escrita.
 */
export const notifyMessageCreated = async (
  message: Message,
  ticketId: number,
): Promise<void> => {
  await messageService.notifyMessageCreated(message, ticketId);
};

/**
 * Persiste uma mensagem no caminho legado que não possui transação de ticket.
 */
export const VerifyMessage = async (
  message: MessageInternal,
  contato: ContactInternal,
  ticketId: number,
  session: SessionInternal,
) => {
  const messageData = await buildMessageData(message, contato, session);

  return await messageService.createMessage({
    ...messageData,
    ticket: {
      connect: { id: ticketId },
    },
  });
};
