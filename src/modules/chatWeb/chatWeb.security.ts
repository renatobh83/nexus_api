export const DEFAULT_CHAT_TOKEN_RATE_LIMIT_MAX = 10;
export const DEFAULT_CHAT_TOKEN_RATE_LIMIT_WINDOW_MS = 60_000;
export const MAX_CHAT_TOKEN_RATE_LIMIT_MAX = 1_000;
export const MAX_CHAT_TOKEN_RATE_LIMIT_WINDOW_MS = 3_600_000;

export type ChatTokenRateLimitConfig = Readonly<{
  max: number;
  timeWindow: number;
}>;

function parseBoundedPositiveInteger(
  value: string | undefined,
  fallback: number,
  maximum: number,
): number {
  const parsed = Number.parseInt(value ?? "", 10);

  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, maximum);
}

/**
 * Normaliza a configuração da limitação de emissão de tokens sem aceitar
 * valores vazios, negativos, fracionários ou excessivamente altos.
 */
export function getChatTokenRateLimitConfig(
  env: NodeJS.ProcessEnv = process.env,
): ChatTokenRateLimitConfig {
  const max = parseBoundedPositiveInteger(
    env.CHAT_TOKEN_RATE_LIMIT_MAX,
    DEFAULT_CHAT_TOKEN_RATE_LIMIT_MAX,
    MAX_CHAT_TOKEN_RATE_LIMIT_MAX,
  );
  const timeWindow = parseBoundedPositiveInteger(
    env.CHAT_TOKEN_RATE_LIMIT_WINDOW_MS,
    DEFAULT_CHAT_TOKEN_RATE_LIMIT_WINDOW_MS,
    MAX_CHAT_TOKEN_RATE_LIMIT_WINDOW_MS,
  );

  return { max, timeWindow };
}

/**
 * A política de produção limita a emissão por IP segundo `request.ip`, usando
 * a resolução padrão do Fastify e sem confiar em `X-Forwarded-For` enquanto
 * `trustProxy` não estiver configurado explicitamente.
 */
