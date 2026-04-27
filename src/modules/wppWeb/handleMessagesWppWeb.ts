import { Contact, Message } from "wbotconnect";
import { Session } from "../providers/wpp-web/Wpp-web";
import { createTicket } from "../tickets/Helpers/CreateTicket";
import { VerifyMessage } from "./handleVerifyMessage";

export const handleMessage = async (message: Message, session: Session) => {
  const chat = await session.getChatById(message.chatId);
  let contato: Contact;

  if (message.isGroupMsg && !message.fromMe) {
    const grupo = await session.getContact(chat.id._serialized);
    contato = grupo;
  } else if (message.fromMe) {
    const { phoneNumber } = await session.getPnLidEntry(message.to);
    const user = await session.getContact(phoneNumber._serialized);
    contato = user;
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
    session.id,
    message.isGroupMsg,
    lastMessage,
    chat.unreadCount,
  );

  if (isNew) {
    console.log("Is new");
  } else {
    console.log("Old Ticket");
  }

  VerifyMessage(message, contato, ticket.id, session);
};
