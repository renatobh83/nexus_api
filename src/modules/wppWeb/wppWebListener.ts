import { Message } from "wbotconnect";

import { handleMessage } from "./handleMessagesWppWeb";
import { Session } from "../providers/wpp-web/Wpp-web";

export const wbotWebListener = async (wbot: Session): Promise<void> => {
  /**
   *  Listens to all new messages, sent and received.
   *  Filter para pegar apenas mensagens enviadas.
   *  Nao pega mensagem de status
   *  Nao pega mensagem de listas
   */

  wbot.onAnyMessage(async (message: Message) => {
    if (message.chatId === "status@broadcast") return;
    if (message.type === "list" || message.type === 'unknown') return;
    const messageContent = message.body || message.caption || "";

    await handleMessage(message, wbot);
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
