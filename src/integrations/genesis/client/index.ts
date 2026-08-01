// lib/externalApi/clients.ts

import { ExternalApiClient } from "./ExternalApiClient.js";


// Map garante uma instância por integração — sem login duplicado
const clientPool = new Map<string, ExternalApiClient>();

export function getExternalApiClient(integracao: any): ExternalApiClient {
  const existing = clientPool.get(integracao.id);
  if (existing) return existing;

  const client = new ExternalApiClient({
    baseUrl: integracao.settings.urlBase,
    username: integracao.settings.id, // campos do seu model de Integração
    password: integracao.settings.pw,
    tokenTTLSeconds: integracao.tokenTTL ?? 3300,
  });

  clientPool.set(integracao.id, client);
  return client;
}
