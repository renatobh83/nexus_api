import { Prisma, Ticket } from "../../generated/prisma/client";
import { transformFile } from "../../utils/messsageMedia";
import { SendMessageWppWeb } from "./SendMessageWppWeb";
type TicketWithChannel = Prisma.TicketGetPayload<{
  include: {
    messages: true;
    channel: {
      select: {
        name: true;
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

  const channel = ticket.channel?.name;
  switch (channel) {
    case "whatsapp":
      SendMessageWppWeb(body, ticket, hasMedia);
      break;
    default:
      break;
  }
};
