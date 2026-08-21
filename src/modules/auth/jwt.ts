import jwt, { JwtPayload, VerifyOptions } from "jsonwebtoken";

export type AuthTokenType = "user" | "chat-client" | "internal";

export interface AuthClaims extends JwtPayload {
  id?: string | number;
  sub?: string;
  email?: string;
  name?: string;
  profile?: string;
  role?: string;
  type?: AuthTokenType | string;
  service?: string;
}

const JWT_ALGORITHMS: VerifyOptions["algorithms"] = ["HS256"];

export function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `Variável de ambiente obrigatória não configurada: ${name}`,
    );
  }

  return value;
}

export function extractBearerToken(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;

  const match = value.match(/^Bearer\s+([^\s]+)$/i);
  return match?.[1];
}

export function verifyJwt(
  token: string,
  secret: string,
  options: VerifyOptions = {},
): AuthClaims {
  const payload = jwt.verify(token, secret, {
    algorithms: JWT_ALGORITHMS,
    ...options,
  });

  if (typeof payload === "string") {
    throw new Error("JWT payload inválido");
  }

  return payload as AuthClaims;
}

export function verifyUserToken(token: string): AuthClaims {
  const claims = verifyJwt(token, getRequiredEnv("JWT_SECRET"), {
    issuer: process.env.JWT_ISSUER || undefined,
    audience: process.env.JWT_AUDIENCE || undefined,
  });

  if (claims.type === "chat-client" || claims.role === "guest") {
    throw new Error("Token de chat não pode autenticar usuário interno");
  }

  return {
    ...claims,
    type: claims.type || "user",
    role: claims.role || claims.profile,
  };
}

export function verifyChatToken(token: string): AuthClaims {
  const claims = verifyJwt(token, getRequiredEnv("CHAT_SECRET"), {
    issuer: process.env.CHAT_JWT_ISSUER || undefined,
    audience: process.env.CHAT_JWT_AUDIENCE || undefined,
  });

  if (claims.type !== "chat-client" || claims.role !== "guest") {
    throw new Error("Token de chat inválido");
  }

  if (typeof claims.email !== "string" || !claims.email.trim()) {
    throw new Error("Token de chat sem email");
  }

  if (typeof claims.name !== "string" || !claims.name.trim()) {
    throw new Error("Token de chat sem nome");
  }

  return claims;
}

export function signUserToken(payload: Record<string, unknown>): string {
  const options: jwt.SignOptions = {
    algorithm: "HS256",
    expiresIn: "7d",
  };

  if (process.env.JWT_ISSUER) options.issuer = process.env.JWT_ISSUER;
  if (process.env.JWT_AUDIENCE) options.audience = process.env.JWT_AUDIENCE;

  return jwt.sign(payload, getRequiredEnv("JWT_SECRET"), options);
}

export function signRegistrationToken(
  payload: Record<string, unknown>,
): string {
  const options: jwt.SignOptions = {
    algorithm: "HS256",
    expiresIn: "15m",
  };

  return jwt.sign(payload, getRequiredEnv("REGISTRATION_JWT_SECRET"), options);
}

export function verifyRegistrationToken(token: string): AuthClaims {
  return verifyJwt(token, getRequiredEnv("REGISTRATION_JWT_SECRET"));
}

export function signChatToken(payload: Record<string, unknown>): string {
  const options: jwt.SignOptions = {
    algorithm: "HS256",
    expiresIn: "360m",
  };

  if (process.env.CHAT_JWT_ISSUER) {
    options.issuer = process.env.CHAT_JWT_ISSUER;
  }
  if (process.env.CHAT_JWT_AUDIENCE) {
    options.audience = process.env.CHAT_JWT_AUDIENCE;
  }

  return jwt.sign(payload, getRequiredEnv("CHAT_SECRET"), options);
}

export function getClaimSubject(claims: AuthClaims): string | undefined {
  const subject = claims.sub ?? claims.id;
  return subject === undefined || subject === null
    ? undefined
    : String(subject);
}

export function getClaimRole(claims: AuthClaims): string | undefined {
  return claims.role ?? claims.profile;
}
