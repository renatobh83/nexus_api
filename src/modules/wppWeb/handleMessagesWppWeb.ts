import { Message } from "wbotconnect";
import { Session } from "../channels/WppWebChannel";

export const handleMessageReceived = async (message: Message, session: Session) => {
    
    const chat = await session.getChatById(message.chatId);
    
    if (message.isGroupMsg){
        const { phoneNumber} = await session.getPnLidEntry(message.author)
        const grupo = await session.getContact(phoneNumber._serialized)
            console.log(chat)
        } else {
            const { phoneNumber} = await session.getPnLidEntry(message.from)
            const contato = await session.getContact(phoneNumber._serialized)
            console.log(contato)
        }

}

export const handleMessageSend = async (message: Message, session: Session) => {
    
}