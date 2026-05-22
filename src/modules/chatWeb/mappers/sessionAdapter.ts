import {
  ChatInternal,
  ContactInternal,
  SessionInternal,
} from "../../../providers/session.types.js";
import { MessageInternal } from "../../messages/messages.types.js";

export const toInternalMessageChatWeb = async (
  msg: any,
): Promise<MessageInternal> => ({
  body: msg.message || "",
  messageId: msg.id.toString(),
  fromMe: msg.out!,
  isGroupMsg: msg.isGroup || msg.isChannel,
  type: msg.type,
  timestamp: msg.date,
  contactName: msg.nomeContato,
  ticketId: undefined,
  mediaUrl: msg.mediaUrl,
  mediaType: msg.mediaType,
  ack: 1,
  hasReaction: false,
  isForwarded: false,
  isNotification: false,
  to: "",
  from: msg.from,
  caption: undefined,
  content: msg.message,
  mimetype: msg.mediaType,
  chatId: "",
  sender: null,
  socketId: msg.socket,
});

export const toInternalSessionChatWeb = (session: any): SessionInternal => ({
  id: session.id,
  getChatById: function (chatId: string): Promise<ChatInternal> {
    throw new Error("Function not implemented.");
  },
  getContact: function (contactId: string): Promise<ContactInternal> {
    throw new Error("Function not implemented.");
  },
  getPnLidEntry: function (
    id: string,
  ): Promise<{ phoneNumber: { _serialized: string } }> {
    throw new Error("Function not implemented.");
  },
  downloadMedia: function (message: string | any): Promise<string> {
    const relativePath = new URL(message.mediaUrl.trim()).pathname;
    const mediaId = relativePath.replace(/\\/g, "/").split("/")[2] || "unknown";
    return Promise.resolve(mediaId);
  },
});
