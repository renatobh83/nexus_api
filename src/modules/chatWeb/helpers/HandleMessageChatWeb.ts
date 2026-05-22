import { Socket } from "socket.io";
import {
  toInternalMessageChatWeb,
  toInternalSessionChatWeb,
} from "../mappers/sessionAdapter.js";
import { v4 as uuidV4 } from "uuid";
import { ChannelService } from "../../channels/channel.service.js";
import { ContactInternal } from "../../../providers/session.types.js";
import { handleMessage } from "../../messages/handlers/handleMessage.js";

const channelService = new ChannelService();

export const HandleMessageChatWeb = async (
  socket: Socket,
  payload: { name: string; email: string },
) => {
  const channelId = (await channelService.findAll()).find(
    (ch) => ch.type === "web",
  );

  if (!channelId) {
    socket.emit(
      "chat:closedTicket",
      "Me desculpa mas esse canal não esta conectado.",
    );
    return;
  }
  socket.emit("chat:ready");

  const ticket = await channelService.findTicketWebChat(
    payload.email,
    socket.id,
  );

  if (ticket) {
    const messageForTicket = ticket.messages;
    socket.emit("chat:previousMessages", messageForTicket);
  }
  socket.on("chat:message", async (data) => {
    const { msg, mediaUrl } = data;
    const mediaType = getMediaTypeFromUrl(mediaUrl);

    const toInternal = {
      id: uuidV4(),
      message: msg,
      out: false,
      isGroup: false,
      type: mediaType ? "image" : "chat",
      date: new Date().getTime(),
      nomeContato: payload.name,
      media: undefined,
      from: payload.email,
      socket: socket.id,
      mediaUrl: mediaUrl,
      mediaType: mediaType,
    };
    const messageInternal = await toInternalMessageChatWeb(toInternal);
    const sessionInternal = toInternalSessionChatWeb({ id: channelId.id });
    const contato: ContactInternal = {
      id: { _serialized: payload.email },
      name: payload.name,
    };
    await handleMessage(messageInternal, sessionInternal, contato);
  });
};

function getMediaTypeFromUrl(url: string) {
  if (!url) return undefined;

  const match = url.match(/\.([0-9a-z]+)(?:$|\?|#)/i);
  const extension = match ? match[1].toLowerCase() : "";

  const mediaTypes: any = {
    // Imagens
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    webp: "image/webp",

    // Vídeos
    mp4: "video/mp4",
    avi: "video/x-msvideo",
    mov: "video/quicktime",

    // Documentos
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    txt: "text/plain",
    html: "text/html",
    css: "text/css",
    js: "application/javascript",

    // Áudio
    mp3: "audio/mpeg",
    wav: "audio/wav",
  };

  return mediaTypes[extension] || "application/octet-stream";
}
