import {
  ChatInternal,
  ContactInternal,
  SessionInternal,
} from "../../../session.types.js";
import { SessionTbot } from "../tbotProto.js";
import { MessageInternal } from "../../../../modules/messages/messages.types.js";
import { Api } from "teleproto";
import path from "path";
import fs from "fs";

function getPeerId(msg: any): string {
  if (msg.isChannel || msg.isGroup) {
    if ("channelId" in msg.peerId)
      return msg.peerId.channelId?.toString() ?? "";
  }
  if ("userId" in msg.peerId) return msg.peerId.userId?.toString() ?? "";
  if ("channelId" in msg.peerId) return msg.peerId.channelId?.toString() ?? "";
  if ("chatId" in msg.peerId) return msg.peerId.chatId?.toString() ?? "";
  return "";
}

const getNameContato = async (msg: Api.Message) => {
  const sender = await msg.getSender();

  return (sender && (sender as any).firstName) || "N/A";
};
const getFile = (message: Api.Message): string => {
  if (!message.media) return "";
  const mediaType = message.media!.className;
  const fileName = `${mediaType}_${Date.now()}.${getMediaExtension(mediaType, message.media!)}`;
  return fileName;
};
export const toInternalMessageTbot = async (
  msg: Api.Message,
): Promise<MessageInternal> => ({
  body: msg.message || "",
  messageId: msg.id.toString(),
  fromMe: msg.out!,
  isGroupMsg: msg.isGroup || msg.isChannel,
  type: msg.media ? "image" : "chat",
  timestamp: msg.date,
  contactName: await getNameContato(msg),
  ticketId: undefined,
  mediaUrl: getFile(msg),
  mediaType: msg.media,
  ack: 1,
  hasReaction: false,
  isForwarded: false,
  isNotification: false,
  to: getPeerId(msg),
  from: msg._senderId?.toString() || "",
  caption: msg.media ? msg.message : " ",
  content: msg.message,
  mimetype: msg.media
    ? getMediaExtension(msg.media.className, msg.media)
    : undefined,
  chatId: "",
  sender: null,
  quotedMsgId: msg.replyTo?.replyToMsgId?.toString(),
});

export const toInternalSession = (session: SessionTbot): SessionInternal => ({
  id: session.id,
  getChatById: function (chatId: string): Promise<ChatInternal> {
    throw new Error("Function not implemented.");
  },
  getContact: function (contactId: string): Promise<ContactInternal> {
    throw new Error("Function not implemented.");
  },
  getPnLidEntry: function (
    id: string,
  ): Promise<{ phoneNumber: { _serialized: string } }> {
    throw new Error("Function not implemented.");
  },
  downloadMedia: async function (message: MessageInternal): Promise<string> {
    const media = await session.downloadMedia(message.mediaType)!;

    const filePath = path.join(process.cwd(), "public", message.mediaUrl);

    // Cria o diretório 'downloads' se não existir
    if (!fs.existsSync(path.join(process.cwd(), "public"))) {
      fs.mkdirSync(path.join(process.cwd(), "public"));
    }
    // Salva o buffer no arquivo
    fs.writeFileSync(filePath, media!);
    console.log(`Mídia salva em: ${filePath}`);
    return message.mediaUrl;
  },
});

function getMediaExtension(
  mediaType: string,
  mediaObject: Api.TypeMessageMedia,
) {
  switch (mediaType) {
    case "MessageMediaPhoto":
      return "jpg"; // Fotos geralmente são JPG
    case "MessageMediaDocument":
      // Tenta obter a extensão do documento, se disponível
      if (
        (mediaObject as any).document &&
        (mediaObject as any).document.mimeType
      ) {
        const mime = (mediaObject as any).document.mimeType;
        if (mime.includes("image")) return mime.split("/")[1];
        if (mime.includes("video")) return mime.split("/")[1];
        if (mime.includes("audio")) return mime.split("/")[1];
        // Caso contrário, tenta obter a extensão do nome do arquivo
        if (
          (mediaObject as any).document.attributes &&
          (mediaObject as any).document.attributes.length > 0
        ) {
          const fileNameAttr = (mediaObject as any).document.attributes.find(
            (attr: { className: string }) =>
              attr.className === "DocumentAttributeFilename",
          );
          if (fileNameAttr && fileNameAttr.fileName) {
            const parts = fileNameAttr.fileName.split(".");
            if (parts.length > 1) return parts[parts.length - 1];
          }
        }
      }
      return "bin"; // Extensão padrão para documentos desconhecidos
    case "MessageMediaWebPage":
      return "html"; // Páginas web
    case "MessageMediaContact":
      return "vcf"; // Contatos
    case "MessageMediaGeo":
      return "txt"; // Localização (pode ser salvo como texto)
    case "MessageMediaVenue":
      return "txt"; // Local (pode ser salvo como texto)
    case "MessageMediaGame":
      return "txt"; // Jogo (pode ser salvo como texto)
    case "MessageMediaInvoice":
      return "txt"; // Fatura (pode ser salvo como texto)
    case "MessageMediaPoll":
      return "txt"; // Enquete (pode ser salvo como texto)
    case "MessageMediaDice":
      return "txt"; // Dado (pode ser salvo como texto)
    case "MessageMediaUnsupported":
      return "bin"; // Mídia não suportada
    default:
      return "bin"; // Padrão para outros tipos desconhecidos
  }
}
