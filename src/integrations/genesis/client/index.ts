// lib/externalApi/clients.ts

import { ExternalApiClient } from "./ExternalApiClient.js";

// Map garante uma instância por integração — sem login duplicado
const clientPool = new Map<string, ExternalApiClient>();

const configuredTimeout = Number(process.env.GENESIS_REQUEST_TIMEOUT_MS);
const requestTimeoutMs =
  Number.isFinite(configuredTimeout) && configuredTimeout > 0
    ? configuredTimeout
    : undefined;

/**
 * Reutiliza uma instância por integração para manter o cache de token e aplicar
 * a mesma política de timeout às chamadas do Genesis durante sua vida útil.
 */
export function getExternalApiClient(integracao: any): ExternalApiClient {
  const existing = clientPool.get(integracao.id);
  if (existing) return existing;

  const client = new ExternalApiClient({
    baseUrl: integracao.settings.urlBase,
    username: integracao.settings.id, // campos do seu model de Integração
    password: integracao.settings.pw,
    tokenTTLSeconds: integracao.tokenTTL ?? 3300,
    requestTimeoutMs,
  });

  clientPool.set(integracao.id, client);
  return client;
}
