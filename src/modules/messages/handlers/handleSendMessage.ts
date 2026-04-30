import { Prisma } from "@prisma/client";
import { transformFile } from "../../../utils/messsageMedia.js";
import { SendMessageWppWeb } from "../../../providers/whatsapp-web/wpp-web/SendMessageWppWeb.js";

type TicketWithChannel = Prisma.TicketGetPayload<{
  include: {
    messages: true;
    channel: {
      select: {
        id: true;
        name: true;
        type: true;
      };
    };
  };
}>;

export const SendMessageSystemProxy = async (
  body: string,
  ticket: TicketWithChannel,
  media: any,
) => {
  const hasMedia = Boolean(media) ? await transformFile(media) : false;
  const channel = ticket.channel?.type;

  switch (channel) {
    case "whatsapp":
      SendMessageWppWeb(body, ticket, hasMedia);
      break;
    default:
      break;
  }
};
