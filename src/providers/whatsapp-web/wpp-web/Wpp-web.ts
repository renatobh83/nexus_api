import fs from 'fs';
import path from 'path';

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

function limparLockChromium(userDataDir: string) {
  const lockFiles = ['SingletonLock', 'SingletonSocket', 'SingletonCookie'];
  for (const file of lockFiles) {
    const lockPath = path.join(userDataDir, file);
    if (fs.existsSync(lockPath)) {
      fs.unlinkSync(lockPath);
    }
  }
}


/**
 * Inicializa sessão
 */
export const initWppWeb = async (
  channel: Channel,
  channelService: ChannelService,
): Promise<Session> => {
  try {
    // let wbot: Session;
    limparLockChromium( "./userDataDir/" + channel.name)
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
        "--disable-ipc-flooding-protection",
        "--js-flags=--max-old-space-size=256",

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

/**
 * Fecha o Chrome da sessão e reinicia, reaproveitando o userDataDir
 * (mesma sessão do WhatsApp, sem precisar escanear QR de novo).
 */
export const restartWppWeb = async (
  channel: Channel,
  channelService: ChannelService,
): Promise<Session> => {
  const index = sessions.findIndex((s) => s.id === channel.id);
  const current = index !== -1 ? sessions[index] : undefined;

  if (current) {
    try {
      logger.info(`Reiniciando Chrome da sessão ${channel.name} para liberar memória...`);
      await current.close();
    } catch (error) {
      console.error(`Erro ao fechar sessão ${channel.name} (seguindo mesmo assim):`, error);
    }
    // remove do array pra evitar getWbot() retornar um client morto
    // enquanto o novo ainda não terminou de subir
    sessions.splice(index, 1);
  }

  // pequena pausa pra garantir que o processo antigo do Chrome encerrou
  await sleep(3000);

  return initWppWeb(channel, channelService);
};

/**
 * Lê o consumo de memória (RSS, em MB) do processo do Chrome
 * atrelado a uma sessão, direto do /proc (Linux).
 */
 async function getChromeMemoryMB(client: Session): Promise<number | null> {
  try {
    const browser = (client as any)?.page?.browser?.();
    const pid = browser?.process?.()?.pid;
    if (!pid) return null;

    const status = await fs.promises.readFile(`/proc/${pid}/status`, "utf-8");
    const match = status.match(/VmRSS:\s+(\d+)\s+kB/);
    if (!match) return null;

    return Math.round(parseInt(match[1], 10) / 1024);
  } catch {
    return null; // processo pode não existir mais, ou não estar em Linux
  }
}

/**
 * Monitora periodicamente a memória do Chrome de uma sessão e
 * reinicia automaticamente se ultrapassar o limite definido.
 */
export const monitorSessionMemory = (
  channel: Channel,
  channelService: ChannelService,
  { limitMB = 500, intervalMs = 5 * 60 * 1000 } = {},
) => {
  const interval = setInterval(async () => {
    const session = sessions.find((s) => s.id === channel.id);
    if (!session) return; // sessão não existe mais (removida/parada)

    const memMB = await getChromeMemoryMB(session);
    if (memMB === null) return;

    logger.info(`[memória] Sessão ${channel.name}: ${memMB}MB (limite ${limitMB}MB)`);

    if (memMB > limitMB) {
      await restartWppWeb(channel, channelService);
    }
  }, intervalMs);

  return () => clearInterval(interval); // permite cancelar o monitoramento se precisar
};

/**
 * Retorna o status/memória de uma sessão específica, sem lançar erro
 * se ela ainda não estiver inicializada (útil pra rota HTTP de status).
 */
export const getSessionMemoryInfo = async (channelId: number) => {
  const session = sessions.find((s) => s.id === Number(channelId));

  if (!session) {
    return { online: false, memMB: null, started: false };
  }

  const memMB = await getChromeMemoryMB(session);

  return {
    online: true,
    started: !!session.started,
    memMB,
  };
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