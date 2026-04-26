import { Message } from "wbotconnect";
import { Session } from "../channels/WppWebChannel";
import { handleMessageReceived, handleMessageSend } from "./handleMessagesWppWeb";

export const wbotWebListener = async (wbot: Session): Promise<void> => {
     /**
     *  Listens to all new messages, sent and received.
     *  Filter para pegar apenas mensagens enviadas. 
     *  Nao pega mensagem de status 
     *  Nao pega mensagem de listas
     */
    wbot.onAnyMessage(async (message: Message)=>{

        if (message.chatId === "status@broadcast") return;
        if (!message.fromMe) return;
        if (message.type === "list") return;
        const messageContent = message.body || message.caption || "";
        
        await handleMessageSend(message, wbot)


    })

    /**
     * Evento de mensagem recebida
     */
    wbot.onMessage(async (message: Message): Promise<void> => {
        if (message.chatId === "status@broadcast") return;
        await handleMessageReceived(message, wbot)
        
    })
}