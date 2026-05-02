
import { NewMessageEvent } from "teleproto/events/NewMessage.js";
import {
  ChatInternal,
  ContactInternal,
  SessionInternal,
} from "../../../session.types.js";
import { SessionTbot } from "../tbotProto.js";
import { MessageInternal } from "../../../../modules/messages/messages.types.js";
import { Api } from "teleproto";

// Função auxiliar para normalizar o Wid para string
// const resolveId = (id: string | Wid): string => {
//   if (typeof id === "string") return id;
//   return id._serialized;
// };
function getPeerId(msg: any): string {

  if(msg.isChannel || msg.isGroup) {
    
    if ('channelId' in msg.peerId) return msg.peerId.channelId?.toString() ?? '';
  }
  if ('userId' in msg.peerId) return msg.peerId.userId?.toString() ?? '';
  if ('channelId' in msg.peerId) return msg.peerId.channelId?.toString() ?? '';
  if ('chatId' in msg.peerId) return msg.peerId.chatId?.toString() ?? '';
  return '';
}

const getNameContato = async (msg:  Api.Message)=>{
  const sender = await msg.getSender()
  msg.fromId
  msg.out
  return sender && (sender as any).firstName || "N/A"
}


export const toInternalMessageTbot = async (msg: Api.Message): Promise<MessageInternal> => ({
  body: msg.message ||  "" ,
  messageId: msg.id.toString(),
  fromMe: msg.out!,
  isGroupMsg: msg.isGroup || msg.isChannel,
  type: msg.media  ? "image" : "chat",
  timestamp: msg.date,
  contactName: await getNameContato(msg),
  ticketId: undefined,
  mediaUrl: msg.media,
  mediaType: msg.media ? getMediaExtension(msg.media.className, msg.media) : undefined,
  ack: 1,
  hasReaction: false,
  isForwarded: false,
  isNotification: false,
  to: getPeerId(msg),
  from: msg._senderId?.toString() || "",
  caption: msg.media ? msg.message : " ",
  content:  msg.message,
  mimetype: null,
  chatId: "",
});

export const toInternalSession = (session: SessionTbot): SessionInternal => ({
  id: 0,
  getChatById: function (chatId: string): Promise<ChatInternal> {
    throw new Error("Function not implemented.");
  },
  getContact: function (contactId: string): Promise<ContactInternal> {
    throw new Error("Function not implemented.");
  },
  getPnLidEntry: function (id: string): Promise<{ phoneNumber: { _serialized: string; }; }> {
    throw new Error("Function not implemented.");
  },
  downloadMedia: async function (message: Api.Message): Promise<string> {
    const media = await session.downloadMedia(message.media!) 
    const mediaString = Buffer.isBuffer(media) ? media.toString('utf8') : media! 
    return mediaString;
  }
});

function getMediaExtension(mediaType: string, mediaObject: Api.TypeMessageMedia) {
  
  switch (mediaType) {
    case 'MessageMediaPhoto':
      return 'jpg'; // Fotos geralmente são JPG
    case 'MessageMediaDocument':
      // Tenta obter a extensão do documento, se disponível
      if ((mediaObject as any).document && mediaObject.document.mimeType) {
        const mime = mediaObject.document.mimeType;
        if (mime.includes('image')) return mime.split('/')[1];
        if (mime.includes('video')) return mime.split('/')[1];
        if (mime.includes('audio')) return mime.split('/')[1];
        // Caso contrário, tenta obter a extensão do nome do arquivo
        if (mediaObject.document.attributes && mediaObject.document.attributes.length > 0) {
          const fileNameAttr = mediaObject.document.attributes.find((attr: { className: string; }) => attr.className === 'DocumentAttributeFilename');
          if (fileNameAttr && fileNameAttr.fileName) {
            const parts = fileNameAttr.fileName.split('.');
            if (parts.length > 1) return parts[parts.length - 1];
          }
        }
      }
      return 'bin'; // Extensão padrão para documentos desconhecidos
    case 'MessageMediaWebPage':
      return 'html'; // Páginas web
    case 'MessageMediaContact':
      return 'vcf'; // Contatos
    case 'MessageMediaGeo':
      return 'txt'; // Localização (pode ser salvo como texto)
    case 'MessageMediaVenue':
      return 'txt'; // Local (pode ser salvo como texto)
    case 'MessageMediaGame':
      return 'txt'; // Jogo (pode ser salvo como texto)
    case 'MessageMediaInvoice':
      return 'txt'; // Fatura (pode ser salvo como texto)
    case 'MessageMediaPoll':
      return 'txt'; // Enquete (pode ser salvo como texto)
    case 'MessageMediaDice':
      return 'txt'; // Dado (pode ser salvo como texto)
    case 'MessageMediaUnsupported':
      return 'bin'; // Mídia não suportada
    default:
      return 'bin'; // Padrão para outros tipos desconhecidos
  }
}