import { randomBytes } from "node:crypto";

export const MIN_SECRET_LENGTH = 32;

export type AppEnvironment = "development" | "test" | "staging" | "production";

export type AppConfig = Readonly<{
  nodeEnv: AppEnvironment;
  isProductionLike: boolean;
  databaseUrl: string;
  jwtSecret: string;
  chatSecret: string;
  registrationJwtSecret: string;
  cookieSecret: string;
  encryptionKey?: string;
}>;

function normalizeEnvironment(value: string | undefined): AppEnvironment {
  const normalized = value?.trim().toLowerCase();

  if (!normalized || normalized === "development") {
    return "development";
  }

  if (
    normalized === "production" ||
    normalized === "staging" ||
    normalized === "test"
  ) {
    return normalized;
  }

  throw new Error(
    `NODE_ENV inválido: ${value}. Use development, test, staging ou production.`,
  );
}

function requireEnvironmentValue(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim();

  if (!value) {
    throw new Error(
      `Variável de ambiente obrigatória não configurada: ${name}`,
    );
  }

  return value;
}

function validateSecret(env: NodeJS.ProcessEnv, name: string): string {
  const value = requireEnvironmentValue(env, name);

  if (value.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `${name} deve conter pelo menos ${MIN_SECRET_LENGTH} caracteres.`,
    );
  }

  return value;
}

function validateOptionalEncryptionKey(
  env: NodeJS.ProcessEnv,
  isProductionLike: boolean,
): string | undefined {
  const value = env.ENCRYPTION_KEY?.trim();

  if (!value) {
    if (isProductionLike) {
      throw new Error(
        "Variável de ambiente obrigatória não configurada: ENCRYPTION_KEY",
      );
    }

    return undefined;
  }

  if (!/^[0-9a-f]{64}$/i.test(value)) {
    throw new Error(
      "ENCRYPTION_KEY deve conter exatamente 64 caracteres hexadecimais (32 bytes).",
    );
  }

  return value;
}

function resolveCookieSecret(
  env: NodeJS.ProcessEnv,
  isProductionLike: boolean,
): string {
  const value = env.COOKIE_SECRET?.trim();

  if (!value) {
    if (isProductionLike) {
      throw new Error(
        "Variável de ambiente obrigatória não configurada: COOKIE_SECRET",
      );
    }

    return randomBytes(MIN_SECRET_LENGTH).toString("hex");
  }

  if (value.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `COOKIE_SECRET deve conter pelo menos ${MIN_SECRET_LENGTH} caracteres.`,
    );
  }

  return value;
}

/**
 * Valida e normaliza a configuração necessária para iniciar a API.
 *
 * A função é deliberadamente explícita e sem efeitos colaterais de módulo:
 * comandos de teste e diagnóstico podem importar configurações auxiliares sem
 * falhar antes de escolherem qual ambiente desejam validar. O bootstrap chama
 * esta função antes de registrar plugins e rotas.
 */
export function loadAppConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = normalizeEnvironment(env.NODE_ENV);
  const isProductionLike = nodeEnv === "production" || nodeEnv === "staging";

  const databaseUrl = requireEnvironmentValue(env, "DATABASE_URL");
  if (!/^postgres(?:ql)?:\/\//i.test(databaseUrl)) {
    throw new Error("DATABASE_URL deve usar um esquema PostgreSQL válido.");
  }

  const jwtSecret = validateSecret(env, "JWT_SECRET");
  const chatSecret = validateSecret(env, "CHAT_SECRET");
  const registrationJwtSecret = validateSecret(env, "REGISTRATION_JWT_SECRET");
  const cookieSecret = resolveCookieSecret(env, isProductionLike);
  const encryptionKey = validateOptionalEncryptionKey(env, isProductionLike);

  return {
    nodeEnv,
    isProductionLike,
    databaseUrl,
    jwtSecret,
    chatSecret,
    registrationJwtSecret,
    cookieSecret,
    encryptionKey,
  };
}
