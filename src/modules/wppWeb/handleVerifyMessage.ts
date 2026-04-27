import { writeFile } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { Contact, Message } from "wbotconnect";
import { Prisma } from "../../generated/prisma/client";
import { Session } from "../providers/wpp-web/Wpp-web";
import { buildFilename, getSafeExtension } from "../../utils/messsageMedia";
import { MessageService } from "../messages/messages.service";

export enum MessageStatus {
  pending = "pending",
  sent = "sent",
  delivered = "delivered",
  read = "read",
  failed = "failed",
}
const writeFileAsync = promisify(writeFile);

export const VerifyMessage = async (
  message: Message,
  contato: Contact,
  ticketId: number,
  session: Session,
) => {
  console.log(message)
  const body =
    message.type === "list" ? "message.list.description" : message.content;
  if (message.type !== "chat") {
  } else {
  }
  const media =
    message.type !== "chat" ? await session.downloadMedia(message) : "";
  const matches = media.match(/^data:(.+);base64,(.+)$/);
  const base64Data = matches ? matches[2] : media;

  const fileData = Buffer.from(base64Data, "base64");
  let ext = getSafeExtension(message.caption!, message.mimetype);
  const filename = buildFilename(message, ext);
  if (media) {
    await writeFileAsync(
      join(__dirname, "..", "..", "..", "public", filename),
      fileData,
    );
  }
  const messageData: Prisma.MessageCreateInput = {
    messageId: message.id,
    body: message.type === "chat" ? body : message.caption || filename,
    ack: message.ack,
    timestamp: message.timestamp,
    status: message.fromMe
      ? ("sended" as MessageStatus)
      : ("received" as MessageStatus),
    mediaUrl: message.type === "chat" ? "" : filename,
    read: message.fromMe,
    mediaType: message.type === "chat" ? "" : message.mimetype,
    sendType: "chat",
    fromMe: message.fromMe,
    contato: contato.formattedName,
  };

  messageData.ticket = {
    connect: { id: ticketId },
  };
  const messageService = new MessageService();
  messageService.createMessage(messageData);
};
