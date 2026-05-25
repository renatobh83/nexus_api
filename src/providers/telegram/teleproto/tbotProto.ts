import { TelegramClient } from "teleproto";
import { StringSession } from "teleproto/sessions/StringSession.js";
import { Channel } from "@prisma/client";
import { ChannelService } from "../../../modules/channels/channel.service.js";
import { teleprotoListener } from "./teleprotoListener.js";

export interface SessionTbot extends TelegramClient {
  id: number;
}

const sessions: SessionTbot[] = [];

export const initTeleproto = async (
  channel: Channel,
  channelService: ChannelService,
): Promise<SessionTbot> => {
  const apiId = parseInt(process.env.TELEPROTO_API_ID || "O");

  const apiHash = process.env.TELEPROTO_API_HASH || "";
  // sessão vazia (primeiro login)
  const stringSession = new StringSession(
    process.env.TELEPROTO_STRING_SESSION || "",
  );

  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  }) as SessionTbot;

  await client.connect();
  // Verifica se a sessão é válida

  if (!client.isUserAuthorized()) {
    console.log(
      "Sessão inválida ou expirada. Por favor, execute o script de login novamente para obter uma nova sessão.",
    );
    await client.disconnect();
  }
  const me = await client.getMe();

  client.id = channel.id;

  const index = sessions.findIndex((s) => s.id === channel.id);
  if (index === -1) {
    sessions.push(client);
  } else {
    sessions[index] = client;
  }

  await channelService.update(channel.id, {
    status: "CONNECTED",
    qrcode: "",
    retries: 0,
    phone: me,
    session: channel.name,
    pairingCode: "",
  });
  teleprotoListener(client);

  return client;
};

/**
 * Recupera sessão
 */
export const getTbot = (channelId: number): SessionTbot => {
  const session = sessions.find((s) => s.id === Number(channelId));

  if (!session) {
    throw new Error("ERR_TELEPROOT_NOT_INITIALIZED");
  }

  return session;
};

export const teleprotoDisconnect = async (sessionId?: number) => {
  if (sessionId) {
    await sessions.find((s) => s.id === sessionId)?.disconnect();
  } else {
    sessions.map(async (client) => await client.disconnect());
  }
};

// const apiId   = 37071633;
// const apiHash = "6419c1f3fa3eedf28893611f8d0720d3";
// // sessão vazia (primeiro login)
// const session = new StringSession("1AQAOMTQ5LjE1NC4xNzUuNTIBu0buIcLZUfwgKweo4ZvJwxma35LnhArKs+34CO+cs9igEl1mKzvsiCb6TMruJD1JFNNzEEjx2OVkX8pd0xmMbYtmLXhbKNHV4S+qgCKYkX8q6DPN0JZlLNWoEYoUIwBPSMKyPDSHePQH+Du3bEhI0jqSoIASiZHQNhGfYbMCbTI7MCRumk+gw4b0Ga+dFtmt7T4PpiFwiibPzEP7SgBZaerUUZiByKIVADKqS9roE9Kd6fzy6fDozJkkZ9o6XXktv+PXmridgSb+3H/yLfoyvagjT1BlOEjK0WLN3ZXhulB8X/6QaZ2bdzG8x5p44HcKd7HqMdvdQ/1OJ79dkzIuvWQ=");

// async function main() {
//   const client = new TelegramClient(session, apiId, apiHash, {
//     connectionRetries: 5,
//   });

//   await client.connect();

//    // Verifica se a sessão é válida
//   if (!client.isUserAuthorized()) {
//     console.log("Sessão inválida ou expirada. Por favor, execute o script de login novamente para obter uma nova sessão.");
//     await client.disconnect();
//     return;
//   }

//   const me = await client.getMe();
//   console.log("👤 Conectado como:", me?.username || "desconhecido");

//   console.log("👂 Escutando por novas mensagens...");
//   // let sender: any |  undefined = undefined
//   //  Adiciona um listener para novas mensagens
//   // Sempre que uma nova mensagem for recebida, esta função será executada.
//   client.addEventHandler(async (event) => {
//     if (event.message && event.message.message) {
//       // console.log(event)
//       console.log("\n--- Nova Mensagem Recebida ---");
//       console.log("De:", event.message.peerId.className);
//       // console.log("Texto:", event.message.message);
//       console.log("------------------------------");

//       console.log(event.message._chat)
//        if (event.message.media) {
//          if (event.message.media) {
//         console.log("Mídia detectada!");

//         // Obtém o tipo de mídia (ex: MessageMediaPhoto, MessageMediaDocument)
//         const mediaType = event.message.media.className;
//         console.log("Tipo de Mídia:", mediaType);

//         try {
//           // Baixa a mídia
//           // O client.downloadMedia retorna um Buffer com o conteúdo do arquivo
//           const buffer = await client.downloadMedia(event.message.media);

//           // Gera um nome de arquivo único
//           const fileName = `${mediaType}_${Date.now()}.${getMediaExtension(mediaType, event.message.media)}`;
//           const filePath = path.join(process.cwd(), "public", fileName);

//           // Cria o diretório 'downloads' se não existir
//           if (!fs.existsSync(path.join(process.cwd(), "public"))) {
//             fs.mkdirSync(path.join(process.cwd(), "public"));
//           }

//           // Salva o buffer no arquivo
//           fs.writeFileSync(filePath, buffer);
//           console.log(`Mídia salva em: ${filePath}`);

//         } catch (downloadError) {
//           console.error("Erro ao baixar a mídia:", downloadError);
//         }
//       } else {
//         console.log("Nenhuma mídia na mensagem.");
//       }
//        }
//       // Obtendo informações detalhadas do remetente
//      const sender = await event.message.getSender()

//       console.log("ID do Remetente:", sender && sender.id.toString());
//       console.log("Nome do Remetente:", sender && sender.firstName || "N/A");
//       console.log("Sobrenome do Remetente:", sender && sender.lastName || "N/A");
//       console.log("Username do Remetente:", sender && sender.username || "N/A");
//       console.log("Tipo de Remetente:", sender && sender.className); // Ex: User, Channel, Chat

//       // Você também pode acessar o peerId diretamente para algumas informações básicas
//       console.log("Peer ID (direto):", event.message.peerId.userId || event.message.peerId.channelId || event.message.peerId.chatId);

//       console.log("------------------------------");
//     }

//     // Exemplo de resposta automática: se a mensagem for "ping", responde "pong"
//     if (event.message.message === "ping") {
//       await client.sendMessage(event.message.peerId, { message: "pong" });
//       console.log("Resposta enviada: pong");
//     }
//   }, new NewMessage({}));

//   client.addEventHandler(async(event)=>{

//     if (event.message && event.message.media) {
//        const sender = event.message.sender
//       console.log("\n--- Nova Mensagem Media ---");
//       console.log("De:", event.message.peerId.className);
//       // console.log("Texto:", event.message.message);

//       console.log("ID do Remetente:", sender && sender.id.toString());
//       console.log("Nome do Remetente:", sender && sender.firstName || "N/A");
//       console.log("Sobrenome do Remetente:", sender && sender.lastName || "N/A");
//       console.log("Username do Remetente:", sender && sender.username || "N/A");
//       console.log("Tipo de Remetente:", sender && sender.className); // Ex: User, Channel, Chat
//       }
//   }, new EventBuilder({}))

//   client.addEventHandler(async (event) => {
//     console.log(event.message)
//   },new EditedMessage({}))

//     // Para manter o cliente ativo indefinidamente e continuar escutando por mensagens,
//   // o processo Node.js precisa permanecer em execução. A linha abaixo simula isso.
//   // Pressione Ctrl+C no terminal para encerrar o script.
//   console.log("Cliente ativo. Pressione Ctrl+C para sair.");
//   await new Promise(() => {});
// }

// // Função auxiliar para determinar a extensão do arquivo com base no tipo de mídia
// function getMediaExtension(mediaType: string, mediaObject: Api.TypeMessageMedia) {
//   switch (mediaType) {
//     case 'MessageMediaPhoto':
//       return 'jpg'; // Fotos geralmente são JPG
//     case 'MessageMediaDocument':
//       // Tenta obter a extensão do documento, se disponível
//       if (mediaObject.document && mediaObject.document.mimeType) {
//         const mime = mediaObject.document.mimeType;
//         if (mime.includes('image')) return mime.split('/')[1];
//         if (mime.includes('video')) return mime.split('/')[1];
//         if (mime.includes('audio')) return mime.split('/')[1];
//         // Caso contrário, tenta obter a extensão do nome do arquivo
//         if (mediaObject.document.attributes && mediaObject.document.attributes.length > 0) {
//           const fileNameAttr = mediaObject.document.attributes.find((attr: { className: string; }) => attr.className === 'DocumentAttributeFilename');
//           if (fileNameAttr && fileNameAttr.fileName) {
//             const parts = fileNameAttr.fileName.split('.');
//             if (parts.length > 1) return parts[parts.length - 1];
//           }
//         }
//       }
//       return 'bin'; // Extensão padrão para documentos desconhecidos
//     case 'MessageMediaWebPage':
//       return 'html'; // Páginas web
//     case 'MessageMediaContact':
//       return 'vcf'; // Contatos
//     case 'MessageMediaGeo':
//       return 'txt'; // Localização (pode ser salvo como texto)
//     case 'MessageMediaVenue':
//       return 'txt'; // Local (pode ser salvo como texto)
//     case 'MessageMediaGame':
//       return 'txt'; // Jogo (pode ser salvo como texto)
//     case 'MessageMediaInvoice':
//       return 'txt'; // Fatura (pode ser salvo como texto)
//     case 'MessageMediaPoll':
//       return 'txt'; // Enquete (pode ser salvo como texto)
//     case 'MessageMediaDice':
//       return 'txt'; // Dado (pode ser salvo como texto)
//     case 'MessageMediaUnsupported':
//       return 'bin'; // Mídia não suportada
//     default:
//       return 'bin'; // Padrão para outros tipos desconhecidos
//   }
// }
// main().catch(error => console.error("Erro na execução principal:", error));
