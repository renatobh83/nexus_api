import { create, defaultOptions, Whatsapp } from "wbotconnect";
import { Prisma, Channel } from "@prisma/client";
import { ChannelService } from "../../../modules/channels/channel.service.js";
import { wbotWebListener } from "./wppWebListener.js";

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

    const wbotRef: { current?: Session } = {};

    const options = {
      logQR: true,
      phoneNumber: channel.pairingCodeEnabled ? channel.wppUser! : undefined,
      headless: true,

      puppeteerOptions: {
        userDataDir: "./userDataDir/" + channel.name,
      },
    };

    const mergedOptions = { ...defaultOptions, ...options };

    const instance = await create({
      ...mergedOptions,

      catchQR: async (_base64, _ascii, attempts, urlCode) => {
        const qrCode = extractQrCode(urlCode!);

        if (qrCode) {
          await channelService.update(channel.id, {
            qrcode: qrCode,
            status: "qrcode",
            retries: attempts,
          });
        }
      },

      statusFind: async (statusSession: any) => {
        console.log(
          `INFO: Status da sessão '${channel.name}': ${statusSession}`,
        );

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
        }
      },

      catchLinkCode: async (code: any) => {
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
    triggerStart(channel.id, channelService, channel);
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
 * Aguarda autenticação antes de iniciar
 */
const waitUntilAuthenticated = async (
  client: Session,
  service: ChannelService,
  channel: Channel,
) => {
  let attempts = 0;

  const check = async () => {
    try {
      if (!client) return;

      const isReady = await client.isAuthenticated();

      if (isReady) {
        console.log("✅ Cliente autenticado");
        await start(client, service, channel);
      } else if (attempts < 10) {
        attempts++;
        setTimeout(check, 1000);
      } else {
        console.log("❌ Timeout aguardando autenticação");
      }
    } catch (err) {
      console.error("Erro ao verificar autenticação:", err);
    }
  };

  check();
};

/**
 * Start da sessão (executa apenas 1x)
 */
const start = async (
  client: Session,
  service: ChannelService,
  channel: Channel,
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

    console.log("🚀 Iniciando sessão...");

    const profileSession: any = await waitForApiValue(client);

    await service.update(channel.id, {
      status: "CONNECTED",
      qrcode: "",
      retries: 0,
      phone: profileSession,
      session: channel.name,
      pairingCode: "",
    });

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
  channelId: number,
  service: ChannelService,
  channel: Channel,
) => {
  let attempts = 0;

  const tryStart = async () => {
    try {
      const client = getWbot(channelId); // 🔥 pega depois

      if (!client) {
        throw new Error("Client ainda não disponível");
      }

      const isReady = await client.isAuthenticated();

      if (isReady) {
        await start(client, service, channel);
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
