import { MessageInternal } from "../../../../modules/messages/messages.types.js";
import { Session } from "../Wpp-web.js";
import {
  ChatInternal,
  ContactInternal,
  SessionInternal,
} from "../../../session.types.js";

import { writeFile } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import {
  buildFilename,
  getSafeExtension,
} from "../../../../utils/messsageMedia.js";
import { PUBLIC_DIR } from "../../../../config/env.js";
import { Message, Wid } from "@wppconnect-team/wppconnect";

// Função auxiliar para normalizar o Wid para string
const resolveId = (id: string | Wid): string => {
  if (typeof id === "string") return id;
  return id._serialized;
};

export const toInternalMessage = (msg: Message): MessageInternal => ({
  body: msg.body || msg.caption || "",
  messageId: msg.id,
  fromMe: msg.fromMe,
  isGroupMsg: msg.isGroupMsg,
  type: msg.type,
  timestamp: msg.t,
  contactName: msg.sender.formattedName,
  ticketId: undefined,
  mediaUrl: undefined,
  mediaType: msg.mimetype ?? undefined,
  ack: msg.ack,
  hasReaction: msg.hasReaction,
  isForwarded: msg.isForwarded,
  isNotification: msg.isNotification,
  to: msg.to,
  from: msg.from,
  sender: msg.sender.id,
  caption: msg.caption,
  content: msg.content,
  mimetype: msg.mimetype,
  quotedMsgId: msg.quotedMsgId,
  chatId: resolveId(msg.chatId),
});
const writeFileAsync = promisify(writeFile);

export const toInternalSession = (session: Session): SessionInternal => ({
  id: session.id,
  getChatById: async (chatId: string): Promise<ChatInternal> => {
    return await session.getChatById(chatId);
  },

  getContact: async (contactId: string): Promise<ContactInternal> => {
    const contact = await session.getContact(contactId);
    return {
      id: { _serialized: (contact.id as any)._serialized },
      name: contact.name ?? "",
      pushname: contact.pushname,
      formattedName: contact.formattedName,
    };
  },

  getPnLidEntry: async (id: string) => {
    const entry = await session.getPnLidEntry(id);
    return {
      phoneNumber: { _serialized: entry.phoneNumber._serialized },
    };
  },

  downloadMedia: async (message: any): Promise<string> => {
    const media = await session.downloadMedia(message.messageId);
    const matches = media.match(/^data:(.+);base64,(.+)$/);
    const base64Data = matches ? matches[2] : media;

    const fileData = Buffer.from(base64Data, "base64");

    let ext = getSafeExtension(message.caption!, message.mimetype);

    const filename = buildFilename(message, ext);
    if (media) {
      await writeFileAsync(join(PUBLIC_DIR, filename), fileData);
    }
    return filename;
  },
});
