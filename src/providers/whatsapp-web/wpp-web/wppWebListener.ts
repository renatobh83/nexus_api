import { Chat, Message } from "wbotconnect";

import { Session } from "./Wpp-web.js";
import { handleMessage } from "../../../modules/messages/handlers/handleMessage.js";
import {
  toInternalMessage,
  toInternalSession,
} from "./mappers/sessionAdapter.js";
import { ContactInternal } from "../../session.types.js";

const resolveContact = async (
  message: Message,
  session: Session,
): Promise<ContactInternal> => {
  if (message.isGroupMsg && !message.fromMe) {
    const grupo = await session.getContact(message.from);
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
let isSyncing = true;
export const wbotWebListener = async (wbot: Session): Promise<void> => {
  /**
   *  Listens to all new messages, sent and received.
   *  Filter para pegar apenas mensagens enviadas.
   *  Nao pega mensagem de status
   *  Nao pega mensagem de listas
   */
  setTimeout(() => {
    isSyncing = false;
    console.log("Escultando evento onAnyMessage");
  }, 10000);
  wbot.onAnyMessage(async (message: Message) => {
    if (isSyncing) {
      return;
    }

    if (message.chatId === "status@broadcast") return;
    if (message.type === "list" || message.type === "unknown") return;
    const messageContent = message.body || message.caption || "";

    const messageInternal = toInternalMessage(message);
    const session = toInternalSession(wbot);
    const contato = await resolveContact(message, wbot);
    if (message.isGroupMsg) {
      const { phoneNumber } = await session.getPnLidEntry(message.sender.id);
      const contatoSender = await session.getContact(phoneNumber._serialized);
      messageInternal.sender = contatoSender.pushname || null;
    }
    await handleMessage(messageInternal, session, contato);
  });

  // /**
  //  * Evento de mensagem recebida
  //  */
  // wbot.onMessage(async (message: Message): Promise<void> => {
  //     if (message.chatId === "status@broadcast") return;
  //     await handleMessageReceived(message, wbot)

  //     const body = "Teste "
  //     const { phoneNumber} = await wbot.getPnLidEntry(message.from)
  //     const to =phoneNumber._serialized
  //     const msgSended = await wbot.sendText(to, body)
  //     console.log(msgSended)

  // })
};
