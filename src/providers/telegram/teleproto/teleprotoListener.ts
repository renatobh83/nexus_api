import { TelegramClient } from "teleproto"
import { EditedMessage } from "teleproto/events/EditedMessage.js";
import { NewMessage } from "teleproto/events/NewMessage.js";

export const teleprotoListener  = async (tbot: TelegramClient) =>{


    // Mensagens e Mensagem de midia com caption
    tbot.addEventHandler(async (event) => {},  new NewMessage({}));

    // Media message
    tbot.addEventHandler(async (event) => {}, new EditedMessage({}));

}