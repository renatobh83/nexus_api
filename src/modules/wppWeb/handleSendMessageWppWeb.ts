import { Message } from "wbotconnect";

export const handleSendMessageWppWeb = async (
    body: string,
    quotedMsg?: Message,
    userId?: number,
    botId: number
) => {
    console.log(botId)
}