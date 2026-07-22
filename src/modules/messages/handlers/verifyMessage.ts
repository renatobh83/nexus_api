import { MessageInternal } from "../messages.types.js";

import { Prisma } from "@prisma/client";
import { MessageService } from "../messages.service.js";
import {
  ContactInternal,
  SessionInternal,
} from "../../../providers/session.types.js";

const messageService = new MessageService();

export const VerifyMessage = async (
  message: MessageInternal,
  contato: ContactInternal,
  ticketId: number,
  session: SessionInternal,
) => {
  const body =
    message.type === "list"
      ? "message.list.description"
      : message.content || message.body;

  const media =
    message.type !== "chat" ? await session.downloadMedia(message) : "";
  const messageData: Prisma.MessageCreateInput = {
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
    ticket: {
      connect: undefined,
    },
  };
  messageData.ticket = {
    connect: { id: ticketId },
  };

  return await messageService.createMessage(messageData);
};
