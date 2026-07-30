import { Session } from "./Wpp-web.js";
import { handleMessage } from "../../../modules/messages/handlers/handleMessage.js";
import {
  toInternalMessage,
  toInternalSession,
} from "./mappers/sessionAdapter.js";
import { ContactInternal } from "../../session.types.js";
import { Contact, Message } from "@wppconnect-team/wppconnect";
import { checkTicketIntegration } from "../../../modules/externals/Helpers/checkIntegration.js";
import { blockedMessages } from "../../../modules/externals/api/scheduling_api/BlockedMessages.js";
import { Reaction } from "../../../types/reaction.types.js";
import { HandleMsgReaction } from "./HandleMsgReaction.js";

const resolveContact = async (
  message: Message,
  session: Session,
): Promise<Contact> => {
  if (message.isGroupMsg && !message.fromMe) {
    const grupo = await session.getContact(message.from);
    return grupo;
  }
  if (message.fromMe) {
    const target = message.to.includes("g.us")
      ? message.to
      : (await session.getPnLidEntry(message.to)).phoneNumber._serialized;
    return await session.getContact(target);
  }
  const { phoneNumber } = await session.getPnLidEntry(message.from!);
  return await session.getContact(phoneNumber._serialized);
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
  }, 60000);
  wbot.onAnyMessage(async (message: Message) => {
    // if (isSyncing) {
    //   return;
    // }

    if (message.chatId === "status@broadcast") return;
    if (message.type === "list_response" && !message.fromMe) {
      const response = await checkTicketIntegration(message);

      if (!response) {
        wbot.sendText(message.from, "Processo de confirmação já realizado.");
      }
      return;
    }

    const messageContent = message.body || message.caption || "";
    if (message.type === "list" || message.type === "unknown") return;
    const isBlocked = blockedMessages.some((blocked) => {
      return messageContent.includes(blocked);
    });
    if (isBlocked) return;
    const messageInternal = toInternalMessage(message);

    const session = toInternalSession(wbot);

    const contato = (await resolveContact(
      message,
      wbot,
    )) as unknown as ContactInternal;

    if (message.isGroupMsg) {
      const { phoneNumber } = await session.getPnLidEntry(message.sender.id);
      const contatoSender = await session.getContact(phoneNumber._serialized);
      messageInternal.sender = contatoSender.pushname || null;
    }
    await handleMessage(messageInternal, session, contato);
  });
  wbot.onBackendEvent((eventName, ...args) => {
    console.log("Backend event:", eventName, args);
  });
  wbot.onReactionMessage(async (msg: any) => {
    await HandleMsgReaction(msg);
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
