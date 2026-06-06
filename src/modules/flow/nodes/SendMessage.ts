import { resolveTemplate } from "../../../utils/resolveTemplate.js";
import { ChannelService } from "../../channels/channel.service.js";
import { handleSendMessage } from "../../messages/handlers/handleSendMessage.js";

const channelService = new ChannelService()

export const SendMessage = {
  async execute(node: any, context: any) {
    
    const mensagemTemplate = node.data.props.find(
      (p: any) => p.k === "Mensagem"
    )?.v;

    const numero = node.data.props.find(
      (p: any) => p.k === "Numero"
    )?.v;
    
    const mensagem = resolveTemplate(
      mensagemTemplate || context.output?.data,
      context
    );
    
    const contato = numero || context.ticket.contato;
    
    const channelId = context.ticket.channelId;
    
    const channel = await channelService.findChannelOrThrow(
      channelId
    );
    

    await handleSendMessage(
      channel,
      contato,
      mensagem,
      null
    );

    return context;
  },
};