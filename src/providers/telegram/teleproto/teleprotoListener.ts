import { EditedMessage } from "teleproto/events/EditedMessage.js";
import { NewMessage } from "teleproto/events/NewMessage.js";
import { toInternalMessageTbot, toInternalSession } from "./mappers/sessionAdapter.js";
import { EventBuilder } from "teleproto/events/common.js";
import { SessionTbot } from "./tbotProto.js";
import { ContactInternal } from "../../session.types.js";
import { Api } from "teleproto";


const resolveContact = async (
  msg:  Api.Message,
  session: SessionTbot,
): Promise<void> => {
 
    if(msg.isChannel || msg.isGroup) {}
    if ('userId' in msg.peerId) return msg.peerId.userId?.toString() ?? '';
    if ('channelId' in msg.peerId) return msg.peerId.channelId?.toString() ?? '';
    if ('chatId' in msg.peerId) return msg.peerId.chatId?.toString() ?? '';
//   if (message.isGroupMsg && !message.fromMe) {
//     const grupo = await session.getContact(message.chat.id._serialized);
//     return grupo;
//   }
//   if (message.fromMe) {
//     const target = message.to.includes("g.us")
//       ? message.to
//       : (await session.getPnLidEntry(message.to)).phoneNumber._serialized;
//     return session.getContact(target);
//   }
//   const { phoneNumber } = await session.getPnLidEntry(message.from!);
//   return session.getContact(phoneNumber._serialized);
};

export const teleprotoListener  = async (tbot: SessionTbot) =>{
    // Mensagens e Mensagem de midia com caption
    tbot.addEventHandler(async (event) => {

        const messageIsGroup = event.message.isChannel || event.message.isGroup
        // const fromMe = event.message.out
        // console.log(event.message.peerId)
        if(messageIsGroup) return
        const message = await toInternalMessageTbot(event.message)
    
        const session = toInternalSession(tbot)

        console.log(event.message)
        
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