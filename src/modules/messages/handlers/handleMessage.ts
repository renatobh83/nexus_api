import { MessageInternal } from "../messages.types.js";
import { createTicket } from "../../tickets/Helpers/CreateTicket.js";
import { VerifyMessage } from "./verifyMessage.js";
import { waitForSocket } from "../../../lib/socket.js";
import {
  ChatInternal,
  ContactInternal,
  SessionInternal,
} from "../../../providers/session.types.js";




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
  contato: ContactInternal
) => {
  try {
    
    const serialized = contato.id._serialized;
    const lastMessage = formatLastMessage(message);
    const { ticket, isNew } = await createTicket({
      contato: serialized,
      contactOwner: contato,
      channelId: session.id,
      ticketGroup: message.isGroupMsg,
      msg: lastMessage,
      unreadMessages: 0,
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
