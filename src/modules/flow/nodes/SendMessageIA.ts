import { resolveTemplate } from "../../../utils/resolveTemplate.js";
import { ChannelService } from "../../channels/channel.service.js";
import { handleSendMessage } from "../../messages/handlers/handleSendMessage.js";

const channelService = new ChannelService();

export const SendMessageIA = {
  async execute(node: any, context: any) {
    const mensagem = resolveTemplate(context.output?.data, context);

    const contato = context.ticket.contato;

    const channelId = context.ticket.channelId;

    const channel = await channelService.findChannelOrThrow(channelId);

    await handleSendMessage(channel, contato, mensagem, null);

    return context;
  },
};
