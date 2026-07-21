import { Channel } from "@prisma/client";
import { transformFile } from "../../../utils/messsageMedia.js";
import { SendMessageTeleprotoChannel } from "../../../providers/telegram/teleproto/sendMessageTeleprotoChannel.js";
import { SendMessageWppWebChannel } from "../../../providers/whatsapp-web/wpp-web/SendMessageWppWebChannel.js";

export const handleSendMessage = async (
  channel: Channel,
  to: string,
  body: any,
  media: any,
) => {
  const hasMedia = Boolean(media) ? await transformFile(media) : false;

  const channelType = channel.type;

  switch (channelType) {
    case "whatsapp":
      await SendMessageWppWebChannel(body, channel.id, to, hasMedia);
      break;
    case "telegram":
      await SendMessageTeleprotoChannel(body, channel.id, to, hasMedia);
      break;
    default:
      break;
  }
};
