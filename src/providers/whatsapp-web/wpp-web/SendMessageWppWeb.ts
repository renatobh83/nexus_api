import { Ticket } from "@prisma/client";

import { TicketService } from "../../../modules/tickets/tickets.service.js";
import { getWbot } from "./Wpp-web.js";

const ticketService = new TicketService();

type MediaFile = {
  filename: string;
  mimetype: string;
  buffer: Buffer;
};
export const SendMessageWppWeb = async (
  body: string,
  ticket: Ticket,
  hasMedia: boolean | MediaFile,
) => {
  const wbot = getWbot(ticket.channelId);

  if (typeof hasMedia !== "boolean") {
    let mimetype = hasMedia.mimetype;
    const fileData = `data:${mimetype};base64,${hasMedia.buffer.toString(
      "base64",
    )}`;
    if (
      [
        "image/gif",
        "image/png",
        "image/jpg",
        "image/jpeg",
        "image/webp",
      ].includes(mimetype)
    ) {
      const messageSent = await wbot.sendImageFromBase64(
        ticket.contato,
        fileData,
        hasMedia.filename,
        body,
      );
      await ticketService.updateTicket(ticket.id, {
        lastMessage: hasMedia.filename,
        lastMessageAt: Date.now(),
      });
      return messageSent;
    } else {
      const messageSent = await wbot.sendFile(ticket.contato, fileData, {
        filename: hasMedia.filename,
        caption: body || hasMedia.filename,
      });
      await ticketService.updateTicket(ticket.id, {
        lastMessage: hasMedia.filename,
        lastMessageAt: Date.now(),
      });
      return messageSent;
    }
  } else {
    const messageSent = await wbot.sendText(ticket.contato, body);
    await ticketService.updateTicket(ticket.id, {
      lastMessage: body.length > 255 ? body.slice(0, 252) + "..." : body,
      lastMessageAt: Date.now(),
    });
    return messageSent;
  }
};
