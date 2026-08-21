import { redis } from "../../config/redis.js";
import type { AuthClaims } from "./jwt.js";
import {
  assertRevocableIdentity,
  getTokenRevocationKey,
  getTokenRevocationTtlSeconds,
  hasRevocableIdentity,
} from "./tokenRevocation.security.js";

/**
 * Marca um JWT como revogado até o instante em que ele expiraria normalmente.
 *
 * A operação falha quando o Redis não está disponível. Isso evita informar ao
 * usuário que o logout foi concluído enquanto o token ainda poderia ser usado.
 */
export async function revokeToken(claims: AuthClaims): Promise<void> {
  assertRevocableIdentity(claims);

  const key = getTokenRevocationKey(claims.jti as string);
  const ttlSeconds = getTokenRevocationTtlSeconds(claims.exp);

  await redis.set(key, "1", "EX", ttlSeconds);
}

/**
 * Verifica se a sessão representada pelas claims foi revogada no Redis.
 *
 * Claims sem identidade revogável são consideradas inválidas por padrão. O
 * chamador pode transformar essa resposta em um erro de autenticação estável.
 */
export async function isTokenRevoked(claims: AuthClaims): Promise<boolean> {
  if (!hasRevocableIdentity(claims)) {
    return true;
  }

  const key = getTokenRevocationKey(claims.jti as string);
  return (await redis.exists(key)) > 0;
}
