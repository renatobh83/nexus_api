import { EditedMessage } from "teleproto/events/EditedMessage.js";
import { NewMessage } from "teleproto/events/NewMessage.js";
import { toInternalMessageTbot, toInternalSession } from "./mappers/sessionAdapter.js";
import { EventBuilder } from "teleproto/events/common.js";
import { SessionTbot } from "./tbotProto.js";
import { ContactInternal } from "../../session.types.js";
import { Api } from "teleproto";
import { handleMessage } from "../../../modules/messages/handlers/handleMessage.js";


export const resolveContact = async (
    msg: Api.Message,
    session: SessionTbot,
): Promise<ContactInternal> => {

    if (msg.isChannel || msg.isGroup) {
        const sender = msg._chat!
        return {
            id: { _serialized: sender.id.toString() },
            name: (sender as any).title || (sender as any).username,
            pushname: (sender as any).username,
            formattedName: (sender as any).username,
            shortName: (sender as any).title || (sender as any).username,
            photo: (sender as any).photo
        }
    }
    else if (msg.out) {
        const userId = 'userId' in msg.peerId ? msg.peerId.userId?.toString() : ''
        const userEntity = await session.getEntity(userId)

        return {
            id: { _serialized: userEntity.id.toString() },
            name: (userEntity as any).firstName,
            pushname: (userEntity as any).lastName,
            formattedName: (userEntity as any).username,
            shortName: (userEntity as any).firstName,
            photo: (userEntity as any).photo
        }
    } else {
        const sender = await msg.getSender()
        
        return {
            
            id: { _serialized: sender && sender.id.toString() || "N/A" },
            name: sender && (sender as any).firstName || "N/A",
            pushname: sender && (sender as any).lastName || "N/A",
            formattedName: sender && (sender as any).username || "N/A",
            shortName: sender && (sender as any).firstName || "N/A",
            photo: (sender as any).photo
        }
    }

};

export const teleprotoListener = async (tbot: SessionTbot) => {
    // Mensagens e Mensagem de midia com caption
    tbot.addEventHandler(async (event) => {

        const messageIsGroup = event.message.isChannel || event.message.isGroup
        const fromMe = event.message.out
        // console.log(event.message.peerId)
        if(messageIsGroup) return
        const message = await toInternalMessageTbot(event.message)
         
        const session = toInternalSession(tbot)
        const contato = await resolveContact(event.message, tbot)
        
        
        await handleMessage(message, session, contato);

    }, new NewMessage({}));

    // Media message
    tbot.addEventHandler(async (event) => {
            // console.log(event)
        // const messageIsGroup = event.message.isChannel || event.message.isGroup
        // console.log(messageIsGroup)
        // if (messageIsGroup) return

        // if (event.message && event.message.message) {
        //     if (event.message.media) {
        //         const message = await toInternalMessageTbot(event.message)
        //         const session = toInternalSession(tbot)
        //         const contato = await resolveContact(event.message, tbot)
        //         await handleMessage(message, session, contato);
        //     }
        // }
    }, new EventBuilder({}));
    tbot.addEventHandler(async (event) => { }, new EditedMessage({}));

}