import { FastifyInstance } from "fastify";
import { redis } from "../../config/redis.js";
import { verifyRegistrationToken } from "../../modules/auth/jwt.js";
import { cadastrarSenha } from "../../integrations/genesis/services/autoatendimento/index.js";

export async function apiExternalRoutes(app: FastifyInstance) {
  // Get
  app.get("/r/:code", async (request, reply) => {
    const { code } = request.params as any;
    try {
      const originalUrl = await redis.get(`short:${code}`);

      if (!originalUrl) {
        return reply.code(400).send("Link expirado ou inválido");
      }

      return reply.redirect(originalUrl);
    } catch (error) {
      //   return handleServerError(reply, error);
    }
  });
  app.post("/validate-registration-token", async (request, reply) => {
    const { token } = request.body as any;

    if (typeof token !== "string" || !token.trim()) {
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
    const { token, ...formData } = request.body as any;

    if (typeof token !== "string" || !token.trim()) {
      return reply
        .code(401)
        .send({ success: false, message: "Token inválido" });
    }

    try {
      verifyRegistrationToken(token);
    } catch {
      return reply
        .code(401)
        .send({ success: false, message: "Token inválido ou expirado" });
    }

    try {
      await cadastrarSenha(formData);
      return reply.code(200).send({ success: true });
    } catch (error) {
      request.log.error({ error }, "Falha no cadastro externo");
      return reply
        .code(500)
        .send({ success: false, message: "Falha ao concluir o cadastro" });
    }
  });
}
