import { createHash } from "node:crypto";
import type { AuthClaims } from "./jwt.js";

export const TOKEN_REVOCATION_PREFIX = "auth:revoked:";
export const TOKEN_REVOCATION_FALLBACK_TTL_SECONDS = 7 * 24 * 60 * 60;

/**
 * Retorna a chave determinística e não controlável pelo cliente usada no Redis.
 *
 * O `jti` é hashado antes de compor a chave para impedir que caracteres
 * inesperados do identificador alterem a estrutura da chave ou criem colisões
 * semânticas com outros namespaces da aplicação.
 */
export function getTokenRevocationKey(jti: string): string {
  const normalizedJti = jti.trim();

  if (!normalizedJti) {
    throw new Error("JWT sem identificador de revogação");
  }

  const digest = createHash("sha256").update(normalizedJti).digest("hex");
  return `${TOKEN_REVOCATION_PREFIX}${digest}`;
}

/**
 * Calcula por quanto tempo a marca de revogação deve permanecer no Redis.
 *
 * Tokens emitidos pelo serviço sempre possuem `exp`. O fallback mantém a
 * função defensiva para consumidores internos e nunca permite TTL zero ou
 * negativo, que faria a revogação desaparecer imediatamente.
 */
export function getTokenRevocationTtlSeconds(
  expiration: number | undefined,
  nowSeconds = Math.floor(Date.now() / 1000),
): number {
  if (!Number.isFinite(expiration)) {
    return TOKEN_REVOCATION_FALLBACK_TTL_SECONDS;
  }

  return Math.max(1, Math.floor(expiration as number) - nowSeconds);
}

/**
 * Verifica se as claims têm os campos mínimos necessários para revogação
 * individual sem aceitar valores vazios, fracionários ou expirados.
 */
export function hasRevocableIdentity(claims: AuthClaims): boolean {
  return (
    typeof claims.jti === "string" &&
    claims.jti.trim().length > 0 &&
    typeof claims.exp === "number" &&
    Number.isInteger(claims.exp) &&
    claims.exp > 0
  );
}

/**
 * Garante que um token de usuário possa ser revogado antes de ser persistido
 * no Redis, mantendo a falha explícita em vez de uma falsa revogação.
 */
export function assertRevocableIdentity(claims: AuthClaims): void {
  if (!hasRevocableIdentity(claims)) {
    throw new Error("JWT sem claims obrigatórias para revogação");
  }
}
