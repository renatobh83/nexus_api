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

const writeFileAsync = promisify(writeFile);
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
    message.type !== "chat"
      ? await session.downloadMedia(message)
      : "";
  
  // const mediaString = Buffer.isBuffer(media) ? media.toString('utf8') : media;
  const matches = media.match(/^data:(.+);base64,(.+)$/);
  const base64Data = matches ? matches[2] : media;

  const fileData = Buffer.from(base64Data, "base64");
  let ext = getSafeExtension(message.caption!, message.mimetype);
  const filename = buildFilename(message, ext);
  if (media) {
    await writeFileAsync(join(PUBLIC_DIR, filename), fileData);
  }
  // const messageData: Prisma.MessageCreateInput = {
  //   messageId: message.messageId,
  //   body: message.type === "chat" ? body : message.caption || filename,
  //   ack: message.ack,
  //   timestamp: message.timestamp,
  //   mediaUrl: message.type === "chat" ? "" : filename,
  //   read: message.fromMe,
  //   mediaType: message.type === "chat" ? "" : message.mimetype,
  //   sendType: "chat",
  //   isGroupMsg: message.isGroupMsg,
  //   caption: message.caption,
  //   from: message.from,
  //   hasReaction: message.hasReaction,
  //   fromMe: message.fromMe,
  //   contato: contato.formattedName || contato.name,
  //   type: message.type,
  //   to: message.to,
  //   content:
  //     message.type === "chat" ? message.content : message.caption || filename,
  //   mimetype: message.mimetype,
  // };
  // messageData.ticket = {
  //   connect: { id: ticketId },
  // };
  // return await messageService.createMessage(messageData);
};
