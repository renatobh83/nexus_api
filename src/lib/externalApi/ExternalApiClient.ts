// lib/externalApi/ExternalApiClient.ts
import { Redis, RedisOptions } from "ioredis";
import { logger } from "../../modules/tickets/Helpers/CreateTicket.js";
import { redisConnection } from "../../config/redis.js";

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

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: { formEncoded?: boolean }, // ← opção adicional
    retry = true,
  ): Promise<T> {
    const token = await this.getToken();

    const isForm = options?.formEncoded;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": isForm
        ? "application/x-www-form-urlencoded"
        : "application/json",
    };

    const encodedBody = isForm
      ? new URLSearchParams(body as Record<string, string>).toString()
      : body
        ? JSON.stringify(body)
        : undefined;

    const response = await fetch(`${this.config.baseUrl}${path}`, {
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

    return response.json() as Promise<T>;
  }
  // ── Métodos públicos ──────────────────────────────────────────────────────

  async get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  async post<T>(
    path: string,
    body: unknown,
    options?: { formEncoded?: boolean },
  ): Promise<T> {
    return this.request<T>("POST", path, body, options);
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("PUT", path, body);
  }
}
