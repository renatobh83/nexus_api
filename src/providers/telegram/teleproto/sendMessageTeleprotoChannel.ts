import { Ticket } from "@prisma/client";
import { getTbot } from "./tbotProto.js";
import { Api } from "teleproto";
import { CustomFile } from "teleproto/client/uploads.js";
import * as mime from "mime-types"; // Importa a biblioteca mime-types
import { TicketService } from "../../../modules/tickets/tickets.service.js";
import { AuxiTbot } from "./teleprotoListener.js";
const ticketService = new TicketService();

export const SendMessageTeleprotoChannel = async (
  body: string,
  channelId: number,
  to: string,
  hasMedia: any,
) => {
  const tbot = getTbot(channelId);
  if (typeof hasMedia !== "boolean") {
    // Crie uma instância de CustomFile a partir do seu buffer
    const extension = mime.extension(hasMedia.mimetype);
    const fileNameWithExtension = extension
      ? `${hasMedia.filename}.${extension}`
      : hasMedia.filename;

    const customFile = new CustomFile(
      fileNameWithExtension, // Nome do arquivo
      hasMedia.buffer.length, // Tamanho do arquivo
      fileNameWithExtension, // Nome do arquivo novamente (pode ser o mesmo)
      hasMedia.buffer, // O Buffer do arquivo
    );

    const message = await tbot.sendFile(to, {
      file: customFile,
      caption: body,
      forceDocument: true, // Opcional: para enviar como documento mesmo que seja uma imagem/vídeo
    });
    await AuxiTbot(tbot, message);
  } else {
    const message = await tbot.sendMessage(to, { message: body });
    await AuxiTbot(tbot, message);
  }
};
