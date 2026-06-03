import { create, Whatsapp } from "@wppconnect-team/wppconnect";
import { Prisma, Channel } from "@prisma/client";
import { ChannelService } from "../../../modules/channels/channel.service.js";
import { wbotWebListener } from "./wppWebListener.js";
import { defaultOptions } from "@wppconnect-team/wppconnect/dist/config/create-config.js";
import { logger } from "../../../modules/tickets/Helpers/CreateTicket.js";

function extractQrCode(url: string): string | null {
  if (!url) return null;
  return url.replace(/^https:\/\/wa\.me\/settings\/linked_devices#/, "");
}

export interface Session extends Whatsapp {
  id: number;
  started?: boolean; // 🔥 controle para evitar start duplicado
}

const sessions: Session[] = [];

/**
 * Inicializa sessão
 */
export const initWppWeb = async (
  channel: Channel,
  channelService: ChannelService,
): Promise<Session> => {
  try {
    // let wbot: Session;
    let sessionStarted = false;
    const wbotRef: { current?: Session } = {};

    const options = {
      logQR: true,
      phoneNumber: channel.pairingCodeEnabled ? channel.wppUser! : undefined,
      headless: true,
      poweredBy: "RenatoDEV",
      disableWelcome: true,

      browserArgs: [
        // Sandbox / segurança (necessário em VPS/Docker)
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--ignore-certificate-errors",
        "--ignore-ssl-errors",

        // GPU / renderização (headless sem display)
        "--disable-gpu",
        "--disable-accelerated-2d-canvas",
        "--disable-accelerated-video-decode",
        "--disable-software-rasterizer",
        "--disable-accelerated-d-canvas", // mantido por compatibilidade

        // Memória / estabilidade
        "--disable-dev-shm-usage",
        "--memory-pressure-off",
        "--disable-ipc-flooding-protection",

        // Background / throttling
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",

        // Features desnecessárias
        "--disable-extensions",
        "--disable-background-networking",
        "--disable-default-apps",
        "--disable-sync",
        "--disable-notifications",
        "--disable-remote-fonts",
        "--disable-breakpad",
        "--disable-component-update",
        "--disable-hang-monitor",
        "--disable-features=TranslateUI", // corrigido o typo

        // Inicialização
        "--no-first-run",
        "--metrics-recording-only",

        // Janela
        "--window-size=760,468", // corrigido separador (vírgula, não x)
      ],

      puppeteerOptions: {
        userDataDir: "./userDataDir/" + channel.name,
      },
    };

    const mergedOptions = { ...defaultOptions, ...options };

    const instance = await create({
      ...mergedOptions,
      onStreamModeChanged: (mode) => {
        logger.info("Stream mode changed:", mode);
      },
      onStreamInfoChanged: (info) => {
        logger.info("Stream info changed:", info);
      },
      catchQR: async (_base64, _ascii, attempts, urlCode) => {
        if (sessionStarted) return; // 🔥 ignora se já conectou
        const qrCode = extractQrCode(urlCode!);
        if (!qrCode) return;
        const session = sessions.find((s) => s.id === channel.id);
        if (session?.started) return;
        await channelService.update(channel.id, {
          qrcode: qrCode,
          status: "qrcode",
          retries: attempts,
        });
      },

      statusFind: async (statusSession: any) => {
        switch (statusSession) {
          case "autocloseCalled":
          case "desconnectedMobile":
            await channelService.update(channel.id, {
              status: "DISCONNECTED",
              qrcode: "",
              session: "",
              pairingCode: "",
              phone: Prisma.JsonNull,
            });
            break;

          case "qrReadSuccess":
            // triggerStart(channel.id, channelService, channel);
            break;
          case "isLogged":
            break;
        }
      },
      catchLinkCode: async (code: any) => {
        if (sessionStarted) return; // 🔥 opcional mas consistente
        await channelService.update(channel.id, {
          pairingCode: code,
          status: "qrcode",
        });
      },
    });
    await sleep(200);
    wbotRef.current = instance as Session;
    const wbot = wbotRef.current;

    if (!wbot) {
      console.log("⚠️ wbot ainda não inicializado");
    }
    wbot.id = channel.id;
    wbot.started = false;
    triggerStart(channelService, channel, () => {
      sessionStarted = true; // 🔥 seta a flag quando conectar
    });
    // salva sessão
    const index = sessions.findIndex((s) => s.id === channel.id);
    if (index === -1) {
      sessions.push(wbot);
    } else {
      sessions[index] = wbot;
    }

    return wbot;
  } catch (error) {
    console.error("Erro ao iniciar sessão:", error);
    await removeSession(channel.name);
    throw new Error("ERR_INICIAR_SESSAO_WPWEB");
  }
};

/**
 * Start da sessão (executa apenas 1x)
 */
const start = async (
  client: Session,
  service: ChannelService,
  channel: Channel,
  onStarted: () => void,
) => {
  try {
    if (!client) {
      console.log("❌ Client undefined no start");
      return;
    }

    if (client.started) {
      console.log("⚠️ Start já executado, ignorando...");
      return;
    }

    client.started = true;
    onStarted();
    console.log("🚀 Iniciando sessão...");

    const profileSession: any = await waitForApiValue(client);

    try {
      await service.update(channel.id, {
        status: "CONNECTED",
        qrcode: "",
        retries: 0,
        phone: profileSession,
        session: channel.name,
        pairingCode: "",
      });
    } catch (error) {
      console.log(error);
    }

    await wbotWebListener(client);
  } catch (error) {
    console.error("Erro no start wbot:", error);
  }
};

/**
 * Aguarda dados do perfil
 */
async function waitForApiValue(client: Session, interval = 1000) {
  return new Promise((resolve, reject) => {
    const check = async () => {
      try {
        const profileSession = await client.getProfileName();
        const wbotVersion = await client.getWAVersion();
        const number = await client.getWid();

        if (profileSession) {
          resolve({
            profileSession,
            wbotVersion,
            number,
          });
        } else {
          setTimeout(check, interval);
        }
      } catch (error) {
        reject(error);
      }
    };

    check();
  });
}

/**
 * Remove sessão local
 */
export async function removeSession(session: string) {
  try {
    // const sessionPath = path.join(
    //   __dirname,
    //   "..",
    //   "..",
    //   "..",
    //   "..",
    //   "userDataDir",
    //   session,
    // );
    // await new Promise((resolve) => setTimeout(resolve, 2000));
    // await promises.access(sessionPath);
    // fs.rmSync(sessionPath, { recursive: true, force: true });
  } catch (error) {
    console.log("Erro ao remover sessão:", error);
  }
}

/**
 * Recupera sessão
 */
export const getWbot = (channelId: number): Session => {
  const session = sessions.find((s) => s.id === Number(channelId));

  if (!session) {
    throw new Error("ERR_WAPP_NOT_INITIALIZED");
  }
  return session;
};

const triggerStart = async (
  service: ChannelService,
  channel: Channel,
  onStarted: () => void,
) => {
  let attempts = 0;

  const tryStart = async () => {
    try {
      const client = getWbot(channel.id); // 🔥 pega depois

      if (!client) {
        throw new Error("Client ainda não disponível");
      }

      const isReady = await client.isAuthenticated();

      if (isReady) {
        await start(client, service, channel, onStarted);
      } else if (attempts < 10) {
        attempts++;
        setTimeout(tryStart, 1000);
      }
    } catch (err) {
      if (attempts < 10) {
        attempts++;
        setTimeout(tryStart, 1000);
      } else {
        console.error("Erro ao iniciar sessão:", err);
      }
    }
  };

  tryStart();
};

function sleep(time: number): Promise<void> {
  return new Promise((resolve: TimerHandler) => setTimeout(resolve, time));
}
