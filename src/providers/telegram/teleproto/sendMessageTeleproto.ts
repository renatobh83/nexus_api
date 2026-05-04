import { Ticket } from "@prisma/client";
import { getTbot } from "./tbotProto.js";
import { Api } from "teleproto";
import { CustomFile } from "teleproto/client/uploads.js";
import * as mime from "mime-types"; // Importa a biblioteca mime-types
import { TicketService } from "../../../modules/tickets/tickets.service.js";
import { AuxiTbot } from "./teleprotoListener.js";
const ticketService = new TicketService();

export const SendMessageTeleproto = async (
  body: string,
  ticket: Ticket,
  hasMedia: any,
) => {
  const tbot = getTbot(ticket.channelId);
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

    const result = await tbot.sendFile("apiSuportBot", {
      file: customFile,
      caption: body,
      forceDocument: true, // Opcional: para enviar como documento mesmo que seja uma imagem/vídeo
    });
    await AuxiTbot(tbot, result);
    await ticketService.updateTicket(ticket.id, {
      lastMessage: hasMedia.filename,
      lastMessageAt: Date.now(),
    });
  } else {
    const result = await tbot.sendMessage("apiSuportBot", { message: body });
    await AuxiTbot(tbot, result);
    await ticketService.updateTicket(ticket.id, {
      lastMessage: body.length > 255 ? body.slice(0, 252) + "..." : body,
      lastMessageAt: Date.now(),
    });
  }
};
