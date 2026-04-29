import { Message } from "wbotconnect";
import { MessageInternal } from "../../../../modules/messages/messages.types.js";

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
  caption: msg.caption,
  content: msg.content,
  mimetype: msg.mimetype,
  chatId: msg.chatId,
});
