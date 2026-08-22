import path from "node:path";

const LOCK_FILE_NAMES = [
  "SingletonLock",
  "SingletonSocket",
  "SingletonCookie",
] as const;

const DEFAULT_PROFILE_TIMEOUT_MS = 30_000;
const DEFAULT_PROFILE_POLL_INTERVAL_MS = 1_000;
const MIN_PROFILE_TIMEOUT_MS = 1_000;
const MAX_PROFILE_TIMEOUT_MS = 120_000;
const MIN_PROFILE_POLL_INTERVAL_MS = 50;
const MAX_PROFILE_POLL_INTERVAL_MS = 10_000;

export type WppWebRuntimeConfig = Readonly<{
  profileTimeoutMs: number;
  profilePollIntervalMs: number;
  allowNoSandbox: boolean;
  allowInsecureTls: boolean;
}>;

export type WppProfile = Readonly<{
  profileSession: string;
  wbotVersion: string;
  number: string;
}>;

export type WppProfileClient = Readonly<{
  getProfileName: () => Promise<string>;
  getWAVersion: () => Promise<string>;
  getWid: () => Promise<string>;
}>;

export class WppSessionOperationGate {
  private readonly operations = new Map<number, Promise<unknown>>();

  run<T>(channelId: number, operation: () => Promise<T>): Promise<T> {
    const running = this.operations.get(channelId);
    if (running) return running as Promise<T>;

    const operationPromise = Promise.resolve().then(operation);
    const trackedPromise = operationPromise.finally(() => {
      if (this.operations.get(channelId) === trackedPromise) {
        this.operations.delete(channelId);
      }
    });

    this.operations.set(channelId, trackedPromise);
    return trackedPromise;
  }
}

function parseBoolean(value: string | undefined): boolean {
  return ["1", "true", "yes", "on"].includes(value?.trim().toLowerCase() ?? "");
}

function parseBoundedInteger(
  env: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const rawValue = env[name]?.trim();
  if (!rawValue) return fallback;

  if (!/^\d+$/.test(rawValue)) {
    throw new Error(`${name} deve ser um número inteiro positivo.`);
  }

  const value = Number(rawValue);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} deve estar entre ${minimum} e ${maximum}.`);
  }

  return value;
}

export function readWppWebRuntimeConfig(
  env: NodeJS.ProcessEnv = process.env,
): WppWebRuntimeConfig {
  return {
    profileTimeoutMs: parseBoundedInteger(
      env,
      "WPP_WEB_PROFILE_TIMEOUT_MS",
      DEFAULT_PROFILE_TIMEOUT_MS,
      MIN_PROFILE_TIMEOUT_MS,
      MAX_PROFILE_TIMEOUT_MS,
    ),
    profilePollIntervalMs: parseBoundedInteger(
      env,
      "WPP_WEB_PROFILE_POLL_INTERVAL_MS",
      DEFAULT_PROFILE_POLL_INTERVAL_MS,
      MIN_PROFILE_POLL_INTERVAL_MS,
      MAX_PROFILE_POLL_INTERVAL_MS,
    ),
    allowNoSandbox: parseBoolean(env.WPP_WEB_ALLOW_NO_SANDBOX),
    allowInsecureTls: parseBoolean(env.WPP_WEB_ALLOW_INSECURE_TLS),
  };
}

/**
 * A configuração padrão preserva os parâmetros de estabilidade, mas não
 * desativa as proteções de sandbox/TLS. Essas exceções somente entram por
 * opt-in explícito, para que um ambiente de desenvolvimento que realmente
 * precise delas possa configurá-las sem tornar a produção insegura por padrão.
 */
export function buildWppBrowserArgs(
  config: WppWebRuntimeConfig,
): string[] {
  const args = [
     "--no-sandbox",
    "--disable-gpu",
    "--disable-accelerated-2d-canvas",
    "--disable-accelerated-video-decode",
    "--disable-software-rasterizer",
    "--disable-accelerated-d-canvas",
    "--disable-dev-shm-usage",
    "--js-flags=--max-old-space-size=256",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    "--disable-extensions",
    "--disable-background-networking",
    "--disable-default-apps",
    "--disable-sync",
    "--disable-notifications",
    "--disable-remote-fonts",
    "--disable-breakpad",
    "--disable-component-update",
    "--disable-hang-monitor",
    "--disable-features=TranslateUI",
    "--no-first-run",
    "--metrics-recording-only",
    "--window-size=760,468",
  ];

  if (config.allowNoSandbox) {
    args.unshift("--disable-setuid-sandbox", "--no-sandbox");
  }

  if (config.allowInsecureTls) {
    args.unshift("--ignore-ssl-errors", "--ignore-certificate-errors");
  }

  return args;
}

/**
 * Os flags de sandbox e validação TLS são deliberadamente opt-in. Assim, uma
 * variável ausente não degrada silenciosamente o isolamento do navegador.
 */
export function getWppWebUserDataRoot(
  workingDirectory = process.cwd(),
): string {
  return path.resolve(workingDirectory, "userDataDir");
}

export function resolveWppWebSessionDir(
  sessionName: string,
  userDataRoot = getWppWebUserDataRoot(),
): string {
  const normalizedName = sessionName.trim();
  if (!normalizedName || normalizedName === "." || normalizedName === "..") {
    throw new Error("Nome de sessão WhatsApp inválido.");
  }

  const root = path.resolve(userDataRoot);
  const sessionDir = path.resolve(root, normalizedName);
  const relativePath = path.relative(root, sessionDir);

  if (
    !relativePath ||
    relativePath === ".." ||
    relativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error("Nome de sessão WhatsApp fora do diretório permitido.");
  }

  return sessionDir;
}

/**
 * A sessão continua usando o nome original para manter compatibilidade com os
 * diretórios já criados, mas nunca pode escapar de `userDataDir` por meio de
 * `..` ou de um caminho absoluto.
 */
export function getWppWebLockFileNames(): readonly string[] {
  return LOCK_FILE_NAMES;
}

export async function waitForWppProfile(
  client: WppProfileClient,
  {
    timeoutMs,
    intervalMs,
  }: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<WppProfile> {
  const runtimeConfig = readWppWebRuntimeConfig();
  const effectiveTimeoutMs = timeoutMs ?? runtimeConfig.profileTimeoutMs;
  const effectiveIntervalMs = intervalMs ?? runtimeConfig.profilePollIntervalMs;

  if (
    !Number.isFinite(effectiveTimeoutMs) ||
    effectiveTimeoutMs <= 0 ||
    !Number.isFinite(effectiveIntervalMs) ||
    effectiveIntervalMs <= 0
  ) {
    throw new Error("Timeout e intervalo do perfil devem ser positivos.");
  }

  const deadline = Date.now() + effectiveTimeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    const remainingMs = Math.max(1, deadline - Date.now());

    let operationTimeout: ReturnType<typeof setTimeout> | undefined;

    try {
      const operation = Promise.all([
        client.getProfileName(),
        client.getWAVersion(),
        client.getWid(),
      ]).then(([profileSession, wbotVersion, number]) => ({
        profileSession,
        wbotVersion,
        number,
      }));
      const timeout = new Promise<never>((_, reject) => {
        operationTimeout = setTimeout(
          () => reject(new Error("ERR_WPP_PROFILE_OPERATION_TIMEOUT")),
          remainingMs,
        );
      });
      const result = await Promise.race([operation, timeout]);

      if (result.profileSession) {
        if (operationTimeout) clearTimeout(operationTimeout);
        return result;
      }
    } catch (error) {
      lastError = error;
    } finally {
      if (operationTimeout) clearTimeout(operationTimeout);
    }

    const waitMs = Math.min(effectiveIntervalMs, Math.max(1, deadline - Date.now()));
    await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
  }

  const timeoutError = new Error("ERR_WPP_PROFILE_TIMEOUT");
  if (lastError) {
    (timeoutError as Error & { cause?: unknown }).cause = lastError;
  }
  throw timeoutError;
}

/**
 * A espera possui prazo total, inclusive quando uma chamada individual do
 * cliente WPP fica pendurada. Isso evita manter um `setTimeout` recorrente sem
 * fim depois de uma desconexão ou de uma falha do navegador.
 */
export { LOCK_FILE_NAMES };
