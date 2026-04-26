import path from "node:path";
import fs, { promises } from "node:fs";
import { create, defaultOptions, Whatsapp } from "wbotconnect";
import { ChannelsService } from "../../core/Channels/channelsServices";
import { Whatsapp as wppClient } from "../../generated/prisma/client";


function extractQrCode(url: string): string | null {
  if (!url) return null;
  return url.replace(/^https:\/\/wa\.me\/settings\/linked_devices#/, "");
}

export interface Session extends Whatsapp {
  id: number;
}

const sessions: Session[] = [];
let sessionName: string;
let channelSession: wppClient;

/**
 * Inicia uma sessão do wbotconnect para uma determinada conexão de WhatsApp.
 * Esta função configura os callbacks da biblioteca e delega as atualizações de estado
 * para o WhatsappService, mantendo a lógica de negócio separada.
 *
 * @param whatsapp - O objeto da conexão de WhatsApp vindo do banco de dados.
 * @param whatsappService - A instância do serviço para persistir as mudanças.
 * @returns Uma Promise que resolve para a instância do cliente wbot.
 */
export const initWppWeb = async (
  channel: wppClient,
  channelService: ChannelsService
): Promise<void> => {
  try {
    let wbot: Session;
    
    sessionName = channel.name;
    channelSession = channel;
    const qrCodePath = path.join(
    __dirname,
    "..",
    "..",
    "public",
    `qrCode-${channel.id}.png`
  );
      
    const options = {
      logQR: true,
      headless: true,
      // phoneNumber: channel.pairingCodeEnabled ? channel.wppUser : null,
      puppeteerOptions: {
        userDataDir: "./userDataDir/" + channel.name,
      },
    };
    const mergedOptions = { ...defaultOptions, ...options };
   
    wbot = (await create(
        Object.assign({}, mergedOptions,
          {
          catchQR: async (
          base64Qrimg: any,
          asciiQR: any,
          attempts: any,
          urlCode: any
        ) => {
          const qrCode = extractQrCode(urlCode);
          if (qrCode){

            channelService.update(channel.id,{
              qrcode: qrCode,
              status: "qrcode",
              retries: attempts,
              
            })
          }
        },
        statusFind: async (statusSession: any) => {
          console.log(
            `INFO: Status da sessão '${channel.name}': ${statusSession}`
          );
          switch (statusSession) {
            case "autocloseCalled":
            case "desconnectedMobile":
            case "browserClose":
            case "serverClose":
              // Todos esses status levam a uma desconexão.
              await channelService.update(channel.id,{
             status: "CONNECTED",
              qrcode: "",
              retries: 0,
              // phone: phoneInfo,
              session: sessionName,
              pairingCode: "",
            
              
            })
              // Lógica para remover a sessão do array local e limpar arquivos pode ser chamada aqui.
              break;

            case "inChat":
              // Se a sessão está conectada, remove o arquivo do QR Code.
              if (fs.existsSync(qrCodePath)) {
                fs.unlink(qrCodePath, () => {});
              }
              break;

            // Outros status podem ser tratados aqui se necessário.
          }
        },
        catchLinkCode: async (code: any) => {
          await channelService.update(channel.id,{
             pairingCode: code,
              status: "qrcode"
              
            })
        },
        }
      )
    )) as unknown as Session
        const sessionIndex = sessions.findIndex((s) => s.id === channel.id);
         if (sessionIndex === -1) {
          wbot.id = channel.id;
          sessions.push(wbot);
    } else {
      sessions[sessionIndex] = wbot;
    }
    } catch (error) {
        
    }
}

const start = async (client: Session, io: any, service: ChannelsService) => {
  try {
    const isReady = await client.isAuthenticated();

    if (isReady) {
      
      client.startTyping;
      // const profileSession = await waitForApiValue(client, 1000);

       await service.update(channelSession.id,{
             status: "CONNECTED",
              qrcode: "",
              retries: 0,
              // phone: phoneInfo,
              session: channelSession.name,
              pairingCode: "",
              
            })

      if (await client.isAuthenticated()) {
        // await wbotMessageListener(client);
      }
    }
  } catch (_error) {}
};