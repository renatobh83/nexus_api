import { Chat, Contact } from "wbotconnect";
import { Session } from "../../../providers/whatsapp-web/wpp-web/Wpp-web.js";
import { MessageInternal } from "../messages.types.js";
import { createTicket } from "../../tickets/Helpers/CreateTicket.js";
import { VerifyMessage } from "./verifyMessage.js";
import { waitForSocket } from "../../../lib/socket.js";
import {
  ChatInternal,
  ContactInternal,
  SessionInternal,
} from "../../../providers/session.types.js";

type ContactWithId = Contact & { id: { _serialized: string } };

const resolveContact = async (
  chat: ChatInternal,
  message: MessageInternal,
  session: SessionInternal,
): Promise<ContactInternal> => {
  if (message.isGroupMsg && !message.fromMe) {
    const grupo = await session.getContact(chat.id._serialized);
    return grupo;
  }
  if (message.fromMe) {
    const target = message.to.includes("g.us")
      ? message.to
      : (await session.getPnLidEntry(message.to)).phoneNumber._serialized;
    return session.getContact(target);
  }
  const { phoneNumber } = await session.getPnLidEntry(message.from!);
  return session.getContact(phoneNumber._serialized);
};

const formatLastMessage = (message: MessageInternal): string => {
  if (message.type !== "chat") return "Media";
  if (!message.content) return "";
  return message.content.length > 255
    ? message.content.slice(0, 252) + "..."
    : message.content;
};
export const handleMessage = async (
  message: MessageInternal,
  session: SessionInternal,
) => {
  try {
    const chat = await session.getChatById(message.chatId);

    const contato = await resolveContact(chat, message, session);

    const serialized = contato.id._serialized;
    const lastMessage = formatLastMessage(message);
    const { ticket, isNew } = await createTicket({
      contato: serialized,
      contactOwner: contato,
      channelId: session.id,
      ticketGroup: message.isGroupMsg,
      msg: lastMessage,
      unreadMessages: chat.unreadCount,
    });

    const createdMessage = await VerifyMessage(
      message,
      contato,
      ticket.id,
      session,
    );
    const result = {
      ...ticket,
      messages: [createdMessage],
    };
    if (isNew) {
      const io = await waitForSocket();
      io.emit("ticket-updated", result);
    }
  } catch (error) {
    console.error(`Erro ao processar mensagem ${message.messageId}:`, error);
  }
};
