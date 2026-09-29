import { Session } from "./Wpp-web.js";
import { handleMessage } from "../../../modules/messages/handlers/handleMessage.js";
import {
  resolveId,
  toInternalMessage,
  toInternalSession,
} from "./mappers/sessionAdapter.js";
import { ContactInternal } from "../../session.types.js";
import { Contact, Message } from "@wppconnect-team/wppconnect";
import { checkTicketIntegration } from "../../../integrations/genesis/services/scheduling_api/Helpers/checkIntegration.js";

import { Reaction } from "../../../types/reaction.types.js";
import { HandleMsgReaction } from "./HandleMsgReaction.js";
import { blockedMessages } from "../../../integrations/genesis/services/scheduling_api/Helpers/BlockedMessages.js";

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
    if (isSyncing) {
      return;
    }
    // Ações de execução de adcionar no grupo
    if (
      message.type === "gp2" &&
      message.subtype === "add" &&
      message.from === "120363428271342741@g.us"
    ) {
      const recipients = [];
      for (const r of message.recipients ?? []) {
        recipients.push(await wbot.getPnLidEntry(r));
      }
      recipients.forEach((entry) => {
        const nome = entry?.contact?.pushname?.trim() || "amigo(a)";
        wbot.sendText(
          message.from,
          `Olá, *${nome}*! 👋
Seja muito bem-vindo(a) ao nosso grupo de ofertas! 🎉

Aqui você encontra as melhores promoções todos os dias.
Fique à vontade e boas compras! 🛒✨`,
        );
      });
    }
    if (message.type === "gp2") return;
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
    if (!message.id) {
      const chat = await wbot.getChatById(message.chatId);
      message.id = message.fromMe
        ? `true_${message.author}_${chat.lastReceivedKey.id}`
        : `false_${resolveId(message.chatId)}_${chat.lastReceivedKey.id}`;
    }
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
    // Registra apenas metadados; os argumentos podem conter mensagens, contatos ou tokens.
    console.log(
      "Backend event recebido",
      {
        eventName,
        argumentCount: args.length,
      },
      args,
    );
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
