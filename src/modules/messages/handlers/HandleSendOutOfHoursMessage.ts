import { Ticket } from "@prisma/client";

import { SendMessageTeleproto } from "../../../providers/telegram/teleproto/sendMessageTeleproto.js";
import { SendMessageWppWeb } from "../../../providers/whatsapp-web/wpp-web/SendMessageWppWeb.js";
import { SendMessageChatClient } from "../../chatWeb/helpers/SendMessageChatClient.js";
import { ChannelService } from "../../channels/channel.service.js";

const cs = new ChannelService();
export const sendOutOfHoursMessage = async (body: string, ticket: Ticket) => {
  const channel = await cs.findChannel(ticket.channelId);

  switch (channel?.type) {
    case "whatsapp":
      return SendMessageWppWeb(body, ticket, false);

    case "telegram":
      return SendMessageTeleproto(body, ticket, false);
    case "web":
      return SendMessageChatClient(body, ticket, false);

    default:
      break;
  }
};
