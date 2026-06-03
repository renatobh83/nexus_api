import { MessageInternal } from "../messages.types.js";
import { createTicket, logger } from "../../tickets/Helpers/CreateTicket.js";
import { VerifyMessage } from "./verifyMessage.js";
import { getClientIONamespace } from "../../../lib/socket.js";
import {
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
  contato: ContactInternal,
): Promise<void | any> => {
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
      chatClient: message.socketId ? true : false,
      socketId: message.socketId,
    });
    if (ticket.isInteraction) return;

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
      const clientNamespace = getClientIONamespace();
      clientNamespace.emit("ticket-updated", { ...result, isNew });
    }
    if (message.socketId) {
      return { isNew, ticketId: ticket.id };
    }
  } catch (error) {
    console.error(`Erro ao processar mensagem ${message.messageId}:`, error);
  }
};
