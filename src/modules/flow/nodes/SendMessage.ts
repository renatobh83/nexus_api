import { ChannelService } from "../../channels/channel.service.js";
import { handleSendMessage } from "../../messages/handlers/handleSendMessage.js";

const channelService = new ChannelService()

export const SendMessage = {
    async execute(node: any, context: any) {

        console.log(context)
        
        const contato = context.ticket.contato
        const channelId = context.ticket.channelId
   
             
        const channel = await channelService.findChannelOrThrow(channelId)
        
        await handleSendMessage(channel, contato, context.mensagem || "", null)

        return context;
    },
};
