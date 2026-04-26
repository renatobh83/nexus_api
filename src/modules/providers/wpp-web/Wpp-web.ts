import path from "node:path";
import fs, { promises } from "node:fs";
import { create, defaultOptions, Whatsapp } from "wbotconnect";



import { ChannelsService } from "../../channels/services";
import { wbotWebListener } from "../../wppWeb/wppWebListener";
import { Whatsapp as wppClient  } from "../../../generated/prisma/client";


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
): Promise<Session> => {
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
            // case "browserClose":
            case "serverClose":
              // Todos esses status levam a uma desconexão.
              console.log(statusSession)
              await channelService.update(channel.id,{
              status: "DISCONNECTED",
              qrcode: "",
              session: "",
              pairingCode: "",
              phone: Prisma.JsonNull, // Limpa o campo JSON
            
              
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
    start(wbot, channelService);
    return wbot;
    } catch (error) {
        removeSession(channel.name);
        throw new Error("ERR_INICIAR_SESSAO_WPWEB");
    }
}
async function waitForApiValue(apiCall: Session, interval = 1000) {
  return new Promise((resolve, reject) => {
    const checkValue = async () => {
      try {
        const profileSession = await apiCall.getProfileName();

        const wbotVersion = await apiCall.getWAVersion();
        const number = await apiCall.getWid();
        const result = {
          wbotVersion,
          profileSession,
          number,
        };

        if (result !== null) {
          resolve(result); // Retorna o valor assim que não for null
        } else {
          setTimeout(checkValue, interval); // Recheca após o intervalo
        }
      } catch (error) {
        reject(error); // Rejeita a promise em caso de erro
      }
    };
    checkValue(); // Inicia a verificação
  });
}

const start = async (client: Session, service: ChannelsService) => {
  try {
    const isReady = await client.isAuthenticated();

    if (isReady) {
      
      client.startTyping;
      const profileSession: any = await waitForApiValue(client, 1000);
      

      await service.update(channelSession.id,{
             status: "CONNECTED",
              qrcode: "",
              retries: 0,
              phone: profileSession,
              session: channelSession.name,
              pairingCode: "",
              
            })

      if (await client.isAuthenticated()) {

        await wbotWebListener(client);
      }
    }
  } catch (_error) {}
};

export async function removeSession(session: string) {
  try {
    // Defina o caminho da pasta com base no sessionId
    const sessionPath = path.join(
      __dirname,
      "..",
      "..",
      "userDataDir",
      session
    );

    await new Promise((resolve) => setTimeout(resolve, 2000));
    await promises.access(sessionPath);
    fs.rmSync(sessionPath, { recursive: true, force: true });
  } catch (error) {
    console.log(error);
  }
}
export const getWbot = (channelId: number): Session => {
  const sessionIndex = sessions.findIndex((s) => s.id === Number(channelId));
  if (sessionIndex === -1) {
    throw new Error("ERR_WAPP_NOT_INITIALIZED");
  }
  return sessions[sessionIndex];
};