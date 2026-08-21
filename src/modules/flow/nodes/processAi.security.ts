export const AI_REQUEST_TIMEOUT_LIMITS = {
  defaultMs: 30_000,
  maxMs: 120_000,
  minMs: 1_000,
} as const;

export const AI_HISTORY_LIMITS = {
  defaultEntries: 20,
  maxEntries: 100,
  minEntries: 1,
  defaultActiveConversations: 1_000,
  maxActiveConversations: 10_000,
  minActiveConversations: 1,
} as const;

export const AI_ERROR_BODY_MAX_BYTES = 2_048;

/** Retorna a chave do provedor somente quando ela está configurada no ambiente. */
export function getRequiredAiApiKey(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const apiKey = env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não configurada para o node de IA.");
  }

  return apiKey;
}

function parseBoundedInteger(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isInteger(parsed) || parsed < min) {
    return fallback;
  }

  return Math.min(parsed, max);
}

/** Normaliza o limite de histórico configurado no node e impede crescimento ilimitado. */
export function parseAiHistoryLimit(value: unknown): number {
  return parseBoundedInteger(
    value,
    AI_HISTORY_LIMITS.defaultEntries,
    AI_HISTORY_LIMITS.minEntries,
    AI_HISTORY_LIMITS.maxEntries,
  );
}

/** Limita o número de históricos de tickets mantidos simultaneamente em memória. */
export function parseAiActiveConversationLimit(
  value: unknown = process.env.AI_MAX_ACTIVE_CONVERSATIONS,
): number {
  return parseBoundedInteger(
    value,
    AI_HISTORY_LIMITS.defaultActiveConversations,
    AI_HISTORY_LIMITS.minActiveConversations,
    AI_HISTORY_LIMITS.maxActiveConversations,
  );
}

/** Mantém somente as entradas mais recentes do histórico de uma conversa. */
export function trimAiHistory(
  history: { role: string; content: string }[],
  limit: number,
): void {
  if (history.length > limit) {
    history.splice(0, history.length - limit);
  }
}

/** Normaliza o timeout da chamada de IA com default seguro e teto operacional. */
export function getAiRequestTimeoutMs(
  value: unknown = process.env.AI_REQUEST_TIMEOUT_MS,
): number {
  return parseBoundedInteger(
    value,
    AI_REQUEST_TIMEOUT_LIMITS.defaultMs,
    AI_REQUEST_TIMEOUT_LIMITS.minMs,
    AI_REQUEST_TIMEOUT_LIMITS.maxMs,
  );
}

/** Limita a leitura do corpo de erro para evitar retenção de respostas externas enormes. */
export async function readResponseTextLimited(
  response: Response,
  maxBytes = AI_ERROR_BODY_MAX_BYTES,
): Promise<string> {
  if (!response.body) {
    return (await response.text()).slice(0, maxBytes);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let text = "";

  try {
    while (totalBytes < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;

      const remaining = maxBytes - totalBytes;
      const chunk =
        value.byteLength > remaining ? value.subarray(0, remaining) : value;
      totalBytes += chunk.byteLength;
      text += decoder.decode(chunk, { stream: true });

      if (chunk.byteLength < value.byteLength) {
        await reader.cancel();
        break;
      }
    }

    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}
