import { FastifyInstance } from "fastify";
import { channelController } from "../../modules/channels/channel.controller";
import { verifyApiKey } from "../../middlewares/auth";
import { messagesController } from "../../modules/messages/messages.controller";
import { ticketController } from "../../modules/tickets/tickets.controller";

/**
 * Plugin principal que agrupa todas as rotas da API sob um prefixo comum.
 * @param {FastifyInstance} fastify - A instância do Fastify.
 */
async function apiV1Routes(fastify: FastifyInstance) {
  fastify.addHook("onRequest", verifyApiKey);
  fastify.register(channelController, { prefix: "/channel" });
  fastify.register(messagesController, { prefix: "/messages" });
  fastify.register(ticketController, { prefix: "/tickets" });
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
