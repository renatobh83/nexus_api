import { EditedMessage } from "teleproto/events/EditedMessage.js";
import { NewMessage } from "teleproto/events/NewMessage.js";
import { toInternalMessageTbot, toInternalSession } from "./mappers/sessionAdapter.js";
import { EventBuilder } from "teleproto/events/common.js";
import { SessionTbot } from "./tbotProto.js";
import { ContactInternal } from "../../session.types.js";
import { Api, client } from "teleproto";


export const resolveContact = async (
    msg: Api.Message,
    session: SessionTbot,
): Promise<ContactInternal> => {

    if (msg.isChannel || msg.isGroup) {
        const sender = msg._sender
        return {
            id: { _serialized: sender.id.toString() },
            name: sender.firstName,
            pushname: sender.lastName,
            formattedName: sender.username,
            shortName: sender.firstName
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
            shortName: (userEntity as any).firstName
        }
    } else {
        const sender = await msg.getSender()
        return {
            id: { _serialized: sender && sender.id.toString() || "N/A" },
            name: sender && (sender as any).firstName || "N/A",
            pushname: sender && (sender as any).lastName || "N/A",
            formattedName: sender && (sender as any).username || "N/A",
            shortName: sender && (sender as any).firstName || "N/A",
        }
    }

};

export const teleprotoListener = async (tbot: SessionTbot) => {
    // Mensagens e Mensagem de midia com caption
    tbot.addEventHandler(async (event) => {

        const messageIsGroup = event.isChannel || event.isGroup
        const fromMe = event.message.out
        // console.log(event.message.peerId)

        // if(messageIsGroup) return
        const message = await toInternalMessageTbot(event.message)
        const session = toInternalSession(tbot)
        const contato = await resolveContact(event.message, tbot)
        console.log(contato)
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

    }, new NewMessage({}));

    // Media message
    tbot.addEventHandler(async (event) => { }, new EventBuilder({}));
    tbot.addEventHandler(async (event) => { }, new EditedMessage({}));

}