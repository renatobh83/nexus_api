import { Contact, Message } from "wbotconnect";
import { Session } from "../providers/wpp-web/Wpp-web";
import { createTicket } from "../tickets/Helpers/CreateTicket";
import { VerifyMessage } from "./handleVerifyMessage";
import { prisma } from "../../lib/prisma";
import { waitForSocket } from "../../lib/socket";

export const handleMessage = async (message: Message, session: Session) => {
  const chat = await session.getChatById(message.chatId);
  let contato: Contact;

  if (message.isGroupMsg && !message.fromMe) {
    const grupo = await session.getContact(chat.id._serialized);
    contato = grupo;
  } else if (message.fromMe) {
    if (message.to.includes("g.us")) {
      contato = await session.getContact(message.to);
    } else {
      const { phoneNumber } = await session.getPnLidEntry(message.to);
      contato = await session.getContact(phoneNumber._serialized);
    }
  } else {
    const { phoneNumber } = await session.getPnLidEntry(message.from);
    const user = await session.getContact(phoneNumber._serialized);
    contato = user;
  }
  const _serialized = (contato.id as unknown as { _serialized: string })
    ._serialized;

  const lastMessage =
    message.type !== "chat"
      ? "Media"
      : message.content
        ? message.content.length > 255
          ? message.content.slice(0, 252) + "..."
          : message.content
        : "";

  const { ticket, isNew } = await createTicket(
    _serialized,
    contato,
    session.id,
    message.isGroupMsg,
    lastMessage,
    chat.unreadCount,
  );

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
};
