import { Ticket } from "@prisma/client";
import { getIO } from "../../../lib/socket.js";
import { TicketService } from "../../tickets/tickets.service.js";
import { v4 as uuidV4 } from "uuid";
import * as mime from "mime-types";
import { ContactInternal } from "../../../providers/session.types.js";
import {
  toInternalMessageChatWeb,
  toInternalSessionChatWeb,
} from "../mappers/sessionAdapter.js";
import { handleMessage } from "../../messages/handlers/handleMessage.js";

export const SendMessageChatClient = async (
  messageData: any,
  ticket: Ticket,
  hasMedia: any,
) => {
  let link = "";
  const io = getIO();
  const socket = io.sockets.sockets.get(ticket.socketId!);

  if (socket && socket.connected) {
    if (hasMedia) {
      const extension = mime.extension(hasMedia.mimetype);
      link = `${process.env.MEDIA_URL}/public/${hasMedia.filename}.${extension}`;
      socket.emit("chat:image", { url: link });
    }
    socket.emit("chat:reply", messageData);
    const contato: ContactInternal = {
      id: { _serialized: ticket.contato },
      name: "",
    };
    const sessionInternal = toInternalSessionChatWeb({ id: ticket.channelId });
    const toInternal = {
      id: uuidV4(),
      message: messageData,
      out: true,
      isGroup: false,
      type: hasMedia ? "image" : "chat",
      date: new Date().getTime(),
      nomeContato: undefined,
      media: undefined,
      from: "",
      fromMe: true,
      socket: ticket.socketId,
      mediaUrl: hasMedia ? link : undefined,
      mediaType: hasMedia.mimetype,
    };
    const messageInternal = await toInternalMessageChatWeb(toInternal);
    await handleMessage(messageInternal, sessionInternal, contato);
  } else {
    io?.emit("ChatClientDesconectado", {
      ticketId: `${ticket.id}`,
      status: "Cliente Desconectado",
    });
    // socketEmit({
    //   tenantId: ticket.tenantId,
    //   type: "ChatClientDesconectado",
    //   payload: ticket,
    // });
  }
};
