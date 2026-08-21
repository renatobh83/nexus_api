import { Redis } from "ioredis";
import { redisConnection } from "../../../config/redisConnection.js";
const DEFAULT_EXTERNAL_API_TIMEOUT_MS = 30_000;
const MAX_EXTERNAL_API_TIMEOUT_MS = 120_000;

const externalApiLogger = {
  info: (message: string) => console.info(`[ExternalApiClient] ${message}`),
};

type RequestOptions = {
  formEncoded?: boolean;
  stripSe1?: boolean;
  accept?: string;
  responseType?: "json" | "stream" | "arrayBuffer";
  tokenPaciente?: string;
};

export interface ExternalApiConfig {
  baseUrl: string;
  username: string;
  password: string;
  tokenTTLSeconds?: number; // padrão: 55min
  requestTimeoutMs?: number;
}

export interface ExternalApiTokenStore {
  get(key: string): Promise<string | null>;
  setex(key: string, seconds: number, value: string): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

type UnauthorizedResult = {
  unauthorized: true;
};

export class ExternalApiClient {
  private redis: ExternalApiTokenStore;
  private cacheKey: string;
  private tokenTTL: number;
  private requestTimeoutMs: number;

  constructor(
    private config: ExternalApiConfig,
    redis?: ExternalApiTokenStore,
  ) {
    const redisClient = redis ?? new Redis(redisConnection);
    if (redisClient instanceof Redis) {
      redisClient.on("error", (error) => {
        externalApiLogger.info(
          `erro no Redis do cliente Genesis: ${String(error)}`,
        );
      });
    }

    this.redis = redisClient;
    // chave única por baseUrl — suporta múltiplas integrações
    this.cacheKey = `external_api_token:${Buffer.from(config.baseUrl).toString("base64")}`;
    this.tokenTTL = config.tokenTTLSeconds ?? 3300; // 55 minutos
    this.requestTimeoutMs = normalizeTimeout(config.requestTimeoutMs);
  }

  // ── Controle de timeout ───────────────────────────────────────────────────

  /**
   * Executa uma operação externa com um único AbortController para cobrir tanto
   * a espera pelos headers quanto a leitura do corpo da resposta.
   */
  private async withTimeout<T>(
    operation: string,
    task: (signal: AbortSignal) => Promise<T>,
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      return await task(controller.signal);
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error(
          `[${operation}] tempo limite de ${this.requestTimeoutMs} ms excedido`,
          { cause: error },
        );
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  // ── Token ────────────────────────────────────────────────────────────────

  /**
   * Recupera o token do Redis ou solicita uma renovação quando o cache expirou.
   */
  private async getToken(): Promise<string> {
    const cached = await this.withTimeout("Redis GET external_api_token", () =>
      this.redis.get(this.cacheKey),
    );
    if (cached) return cached;

    return this.refreshToken();
  }

  /**
   * Faz login no Genesis com timeout e valida a estrutura mínima da resposta.
   */
  private async refreshToken(): Promise<string> {
    externalApiLogger.info(`renovando token para ${this.config.baseUrl}`);

    const token = await this.withTimeout(
      "POST doFuncionarioLogin",
      async (signal) => {
        const response = await fetch(
          `${this.config.baseUrl}doFuncionarioLogin`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: this.config.username,
              pw: this.config.password,
            }),
            signal,
          },
        );

        if (!response.ok) {
          throw new Error(
            `Login falhou: ${response.status} ${response.statusText}`,
          );
        }

        const data = (await response.json()) as Array<{ ds_token?: unknown }>;
        const receivedToken = data?.[0]?.ds_token;
        if (typeof receivedToken !== "string" || receivedToken.length === 0) {
          throw new Error("Login falhou: resposta sem token válido");
        }

        return receivedToken;
      },
    );

    await this.withTimeout("Redis SETEX external_api_token", () =>
      this.redis.setex(this.cacheKey, this.tokenTTL, token),
    );
    return token;
  }

  // ── HTTP ─────────────────────────────────────────────────────────────────

  /**
   * Monta a URL final mantendo o tratamento legado do caminho `se1`.
   */
  private buildUrl(path: string, stripSe1?: boolean): string {
    const fullPath = `${this.config.baseUrl}${path}`;
    return stripSe1
      ? fullPath.replace("testeportal/dwserver_30910.fcgi/se1/", "")
      : fullPath;
  }

  /**
   * Executa uma chamada autenticada, repete uma vez após 401 e lê respostas
   * dentro do mesmo timeout que protege a requisição HTTP.
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: RequestOptions,
    retry = true,
  ): Promise<T> {
    const token = options?.tokenPaciente ?? (await this.getToken());
    const isForm = options?.formEncoded;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": isForm
        ? "application/x-www-form-urlencoded"
        : "application/json",
      Accept: options?.accept ?? "application/json",
    };

    const encodedBody = isForm
      ? new URLSearchParams(body as Record<string, string>).toString()
      : body
        ? JSON.stringify(body)
        : undefined;

    const url = this.buildUrl(path, options?.stripSe1);
    const result = await this.withTimeout(
      `${method} ${path}`,
      async (signal): Promise<T | UnauthorizedResult> => {
        const response = await fetch(url, {
          method,
          headers,
          body: encodedBody,
          signal,
        });

        if (response.status === 401) {
          return { unauthorized: true };
        }

        if (!response.ok) {
          throw new Error(
            `[${method} ${path}] ${response.status}: ${await response.text()}`,
          );
        }
        if (options?.responseType === "arrayBuffer") {
          return response.arrayBuffer() as Promise<T>;
        }
        if (options?.responseType === "stream") {
          return response.body as unknown as T;
        }
        return response.json() as Promise<T>;
      },
    );

    if (isUnauthorizedResult(result) && retry) {
      await this.withTimeout("Redis DEL external_api_token", () =>
        this.redis.del(this.cacheKey),
      );
      return this.request<T>(method, path, body, options, false);
    }

    if (isUnauthorizedResult(result)) {
      throw new Error(
        `[${method} ${path}] autenticação rejeitada após renovação`,
      );
    }

    return result;
  }

  // ── Métodos públicos ──────────────────────────────────────────────────────

  /**
   * Obtém um recurso binário, como um laudo PDF, usando o timeout configurado.
   */
  async getBinary(
    path: string,
    options?: { stripSe1?: boolean; accept?: string; tokenPaciente?: string },
  ): Promise<ArrayBuffer> {
    return this.request<ArrayBuffer>("GET", path, undefined, {
      ...options,
      accept: options?.accept ?? "application/pdf",
      responseType: "arrayBuffer",
    });
  }

  /**
   * Executa uma chamada GET autenticada no Genesis.
   */
  async get<T>(path: string, options?: { stripSe1?: boolean }): Promise<T> {
    return this.request<T>("GET", path, undefined, options);
  }

  /**
   * Executa uma chamada POST autenticada, JSON ou form-urlencoded.
   */
  async post<T>(
    path: string,
    body: unknown,
    options?: {
      formEncoded?: boolean;
      stripSe1?: boolean;
      tokenPaciente?: string;
    },
  ): Promise<T> {
    return this.request<T>("POST", path, body, options);
  }

  /**
   * Executa uma chamada PUT autenticada no Genesis.
   */
  async put<T>(
    path: string,
    body: unknown,
    options?: { stripSe1?: boolean },
  ): Promise<T> {
    return this.request<T>("PUT", path, body, options);
  }
}

/**
 * Normaliza o timeout para evitar chamadas sem limite ou configurações
 * excessivamente longas que mantêm requisições presas por vários minutos.
 */
function normalizeTimeout(value?: number): number {
  if (!Number.isFinite(value) || (value ?? 0) <= 0) {
    return DEFAULT_EXTERNAL_API_TIMEOUT_MS;
  }

  return Math.min(value as number, MAX_EXTERNAL_API_TIMEOUT_MS);
}

/**
 * Distingue o marcador interno de 401 de uma resposta JSON legítima do
 * serviço externo.
 */
function isUnauthorizedResult<T>(
  result: T | UnauthorizedResult,
): result is UnauthorizedResult {
  return (
    typeof result === "object" &&
    result !== null &&
    "unauthorized" in result &&
    result.unauthorized === true
  );
}
