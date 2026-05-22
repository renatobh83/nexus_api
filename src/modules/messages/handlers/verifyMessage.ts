import { writeFile } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";

import { MessageInternal } from "../messages.types.js";

import {
  buildFilename,
  getSafeExtension,
} from "../../../utils/messsageMedia.js";
import { Prisma } from "@prisma/client";
import { PUBLIC_DIR } from "../../../config/env.js";
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
    caption: message.caption,
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
    ticket: {
      connect: undefined,
    },
  };
  messageData.ticket = {
    connect: { id: ticketId },
  };
  return await messageService.createMessage(messageData);
};
