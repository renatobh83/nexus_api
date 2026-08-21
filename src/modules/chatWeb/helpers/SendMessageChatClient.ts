import { Ticket } from "@prisma/client";
import {
  getChatWebNamespace,
  getClientIONamespace,
  getIO,
} from "../../../lib/socket.js";
import { TicketService } from "../../tickets/tickets.service.js";
import { v4 as uuidV4 } from "uuid";
import { ContactInternal } from "../../../providers/session.types.js";
import {
  toInternalMessageChatWeb,
  toInternalSessionChatWeb,
} from "../mappers/sessionAdapter.js";
import { handleMessage } from "../../messages/handlers/handleMessage.js";
import { buildPublicMediaUrl, getMediaBaseUrl } from "../../../config/media.js";
import { PUBLIC_DIR } from "../../../config/env.js";
import { saveBufferedImage } from "../../../utils/saveFile.js";

export const SendMessageChatClient = async (
  messageData: any,
  ticket: Ticket,
  hasMedia: any,
) => {
  let link = "";
  const chatNamespace = getChatWebNamespace();
  const socket = chatNamespace.sockets.get(ticket.socketId!);

  if (socket && socket.connected) {
    if (hasMedia) {
      // O buffer recebido pela aplicação ainda não está em `public`. Persistimos
      // primeiro e somente depois enviamos a URL ao cliente web.
      const filename = await saveBufferedImage(
        {
          buffer: hasMedia.buffer,
          mimetype: hasMedia.mimetype,
        },
        PUBLIC_DIR,
      );

      link = buildPublicMediaUrl(filename, getMediaBaseUrl());
      socket.emit("chat:image", {
        url: link,
        mediaUrl: link,
        filename,
        mediaType: hasMedia.mimetype,
      });
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
      mediaType: hasMedia?.mimetype,
    };
    const messageInternal = await toInternalMessageChatWeb(toInternal);
    await handleMessage(messageInternal, sessionInternal, contato);
  } else {
    const clientNamespace = getClientIONamespace();
    clientNamespace.emit("ChatClientDesconectado", {
      ticketId: `${ticket.id}`,
      status: "Cliente Desconectado",
    });
  }
};
