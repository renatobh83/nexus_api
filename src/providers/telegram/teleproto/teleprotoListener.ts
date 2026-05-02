import { EditedMessage } from "teleproto/events/EditedMessage.js";
import { NewMessage } from "teleproto/events/NewMessage.js";
import { toInternalMessageTbot, toInternalSession } from "./mappers/sessionAdapter.js";
import { EventBuilder } from "teleproto/events/common.js";
import { SessionTbot } from "./tbotProto.js";

export const teleprotoListener  = async (tbot: SessionTbot) =>{


    // Mensagens e Mensagem de midia com caption
    tbot.addEventHandler(async (event) => {

        const messageIsGroup = event.message.isChannel || event.message.isGroup
        // const fromMe = event.message.out
        // console.log(event.message.peerId)
        if(messageIsGroup) return
        const message = await toInternalMessageTbot(event.message)
    
        const session = toInternalSession(tbot)

        
        
        //  await handleMessage(internal, session, contato);
      
        // console.log("---------------LIMITE-----------------")
        // const peer = new 
        // Api.PeerUser({ userId: event.message?.fromId?.userId });
        // console.log(peer)
        // console.log("ID do Remetente:", sender && sender.id.toString());
        // console.log("Nome do Remetente:", sender && sender.firstName || "N/A");
        // console.log("Sobrenome do Remetente:", sender && sender.lastName || "N/A");
        // console.log("Username do Remetente:", sender && sender.username || "N/A");
        // console.log("Tipo de Remetente:", sender && sender.className); // Ex: User, Channel, Chat

    },  new NewMessage({}));

    // Media message
    tbot.addEventHandler(async (event) => {}, new EventBuilder({}));
    tbot.addEventHandler(async (event) => {}, new EditedMessage({}));

}