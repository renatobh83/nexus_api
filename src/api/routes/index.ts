import { FastifyInstance } from "fastify";
import { channelController } from "../../modules/channels/channel.controller.js";
import { verifyApiKey } from "../middlewares/auth.js";
import { messagesController } from "../../modules/messages/messages.controller.js";
import { ticketController } from "../../modules/tickets/tickets.controller.js";
import { integrationController } from "../../modules/externals/integrationConfig.controller.js";
import { usersController } from "../../modules/users/users.controller.js";
import { authController } from "../../modules/auth/auth.controller.js";

/**
 * Plugin principal que agrupa todas as rotas da API sob um prefixo comum.
 * @param {FastifyInstance} fastify - A instância do Fastify.
 */
async function apiV1Routes(fastify: FastifyInstance) {
  fastify.register(authController, { prefix: "/auth" });
  fastify.addHook("onRequest", verifyApiKey);
  fastify.register(channelController, { prefix: "/channel" });
  fastify.register(messagesController, { prefix: "/messages" });
  fastify.register(ticketController, { prefix: "/tickets" });
  fastify.register(integrationController, { prefix: "/external" });
  fastify.register(usersController, { prefix: "/users" });
}

/**
 * Registra o plugin principal da API com o prefixo global.
 * @param {FastifyInstance} fastify - A instância principal do Fastify.
 */
export async function routes(fastify: FastifyInstance) {
  // Registra nosso plugin de rotas com o prefixo base para a v1 da API.
  // Todas as rotas definidas em 'apiV1Routes' herdarão este prefixo.
  await fastify.register(apiV1Routes, { prefix: "/api/v1" });
}

// Exporta 'routes' como o plugin padrão a ser usado no seu 'server.ts'
export default routes;
