import { Redis } from "ioredis";
import { redisConnection } from "../../../config/redis.js";
import { logger } from "../../../modules/tickets/Helpers/CreateTicket.js";


interface ExternalApiConfig {
  baseUrl: string;
  username: string;
  password: string;
  tokenTTLSeconds?: number; // padrão: 55min
}

export class ExternalApiClient {
  private redis: Redis;
  private cacheKey: string;
  private tokenTTL: number;

  constructor(private config: ExternalApiConfig) {
    this.redis = new Redis(redisConnection);
    // chave única por baseUrl — suporta múltiplas integrações
    this.cacheKey = `external_api_token:${Buffer.from(config.baseUrl).toString("base64")}`;
    this.tokenTTL = config.tokenTTLSeconds ?? 3300; // 55 minutos
  }

  // ── Token ────────────────────────────────────────────────────────────────

  private async getToken(): Promise<string> {
    const cached = await this.redis.get(this.cacheKey);
    if (cached) return cached;

    return this.refreshToken();
  }

  private async refreshToken(): Promise<string> {
    logger.info(
      `[ExternalApiClient] renovando token para ${this.config.baseUrl}`,
    );

    const response = await fetch(`${this.config.baseUrl}doFuncionarioLogin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: this.config.username,
        pw: this.config.password,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Login falhou: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    await this.redis.setex(this.cacheKey, this.tokenTTL, data[0].ds_token);

    return data[0].ds_token;
  }

  // ── HTTP ─────────────────────────────────────────────────────────────────
  private buildUrl(path: string, stripSe1?: boolean): string {
    const fullPath = `${this.config.baseUrl}${path}`;
    return stripSe1 ? fullPath.replace("testeportal/dwserver_30910.fcgi/se1/", "") : fullPath;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: {
      formEncoded?: boolean; stripSe1?: boolean,
      accept?: string;       // ← novo: permite sobrescrever o Accept
      responseType?: "json" | "stream" | "arrayBuffer"; // ← novo
      tokenPaciente?: string
    }, // ← nova opção
    retry = true,
  ): Promise<T> {
    const token = options?.tokenPaciente ?? await this.getToken();
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
    const response = await fetch(url, {
      method,
      headers,
      body: encodedBody,
    });

    if (response.status === 401 && retry) {
      await this.redis.del(this.cacheKey);
      return this.request<T>(method, path, body, options, false);
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
      return response.body as unknown as T; // ReadableStream (fetch nativo do Node 18+)
    }
    return response.json() as Promise<T>;
  }
  // ── Métodos públicos ──────────────────────────────────────────────────────

  async getBinary(
    path: string,
    options?: { stripSe1?: boolean; accept?: string, tokenPaciente?: string },
  ): Promise<ArrayBuffer> {
    return this.request<ArrayBuffer>("GET", path, undefined, {
      ...options,
      accept: options?.accept ?? "application/pdf",
      responseType: "arrayBuffer",
    });
  }

  async get<T>(path: string, options?: { stripSe1?: boolean }): Promise<T> {
    return this.request<T>("GET", path, undefined, options);
  }

  async post<T>(
    path: string,
    body: unknown,
    options?: { formEncoded?: boolean; stripSe1?: boolean, tokenPaciente?: string },
  ): Promise<T> {
    return this.request<T>("POST", path, body, options);
  }

  async put<T>(
    path: string,
    body: unknown,
    options?: { stripSe1?: boolean },
  ): Promise<T> {
    return this.request<T>("PUT", path, body, options);
  }
}
