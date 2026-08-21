import { FastifyInstance, FastifyReply } from "fastify";
import { redis } from "../../config/redis.js";
import { verifyRegistrationToken } from "../../modules/auth/jwt.js";
import { cadastrarSenha } from "../../integrations/genesis/services/autoatendimento/index.js";
import {
  isSafeRedirectTarget,
  isValidShortCode,
  MAX_REGISTRATION_TOKEN_LENGTH,
  parseRegistrationForm,
} from "./apiExternal.security.js";

const REDIS_LOOKUP_TIMEOUT_MS = 5_000;

/** Verifica se o corpo recebido é um objeto JSON simples antes de acessar seus campos. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Evita que consultas ao Redis mantenham uma requisição pública pendurada indefinidamente. */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error("Redis lookup timed out"));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Devolve uma resposta de validação consistente sem revelar detalhes do JWT. */
function sendInvalidRegistration(reply: FastifyReply) {
  return reply.code(400).send({
    error: "Dados de cadastro inválidos",
    message: "Dados de cadastro inválidos",
    success: false,
  });
}

export async function apiExternalRoutes(app: FastifyInstance) {
  app.get("/r/:code", async (request, reply) => {
    const { code } = request.params as { code?: unknown };

    if (!isValidShortCode(code)) {
      return reply.code(400).send("Link inválido");
    }

    try {
      const originalUrl = await withTimeout(
        redis.get(`short:${code}`),
        REDIS_LOOKUP_TIMEOUT_MS,
      );

      if (!originalUrl) {
        return reply.code(404).send("Link expirado ou inválido");
      }

      if (!isSafeRedirectTarget(originalUrl)) {
        request.log.error(
          { code },
          "Destino inseguro encontrado para link curto",
        );
        return reply.code(410).send("Link inválido");
      }

      return reply.redirect(originalUrl);
    } catch (error) {
      request.log.error({ error, code }, "Falha ao resolver link curto");
      return reply.code(503).send("Serviço temporariamente indisponível");
    }
  });

  app.post("/validate-registration-token", async (request, reply) => {
    const body = request.body;
    const token = isRecord(body) ? body.token : undefined;

    if (
      typeof token !== "string" ||
      !token.trim() ||
      token.length > MAX_REGISTRATION_TOKEN_LENGTH
    ) {
      return reply.code(200).send({ valid: false });
    }

    try {
      verifyRegistrationToken(token);
      return reply.code(200).send({ valid: true });
    } catch {
      return reply.code(200).send({ valid: false });
    }
  });

  app.post("/register", async (request, reply) => {
    const body = request.body;
    if (!isRecord(body)) return sendInvalidRegistration(reply);

    const { token, ...formData } = body;

    if (
      typeof token !== "string" ||
      !token.trim() ||
      token.length > MAX_REGISTRATION_TOKEN_LENGTH
    ) {
      return reply.code(401).send({
        error: "Token inválido",
        message: "Token inválido",
        success: false,
      });
    }

    try {
      verifyRegistrationToken(token);
    } catch {
      return reply.code(401).send({
        error: "Token inválido ou expirado",
        message: "Token inválido ou expirado",
        success: false,
      });
    }

    const registrationForm = parseRegistrationForm(formData);
    if (!registrationForm) return sendInvalidRegistration(reply);

    try {
      await cadastrarSenha(registrationForm);
      return reply.code(200).send({ success: true });
    } catch (error) {
      request.log.error({ error }, "Falha no cadastro externo");
      return reply.code(502).send({
        error: "Falha ao concluir o cadastro",
        message: "Falha ao concluir o cadastro",
        success: false,
      });
    }
  });
}
