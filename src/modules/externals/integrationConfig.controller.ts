import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { IntegracaoService } from "./integrationConfig.service.js";
import { checkIntegration } from "./Helpers/checkIntegration.js";

const integracaoService = new IntegracaoService();
export async function integrationController(fastify: FastifyInstance) {
  fastify.post(
    "/createIntegration",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { integrationName, settings, clientId } = request.body as any;

      const config = await integracaoService.createOrUpdateIntegrationConfig(
        integrationName,
        settings,
        clientId,
      );
      reply.status(200).send(config);
    },
  );
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const integracoes = await integracaoService.loadIntegracoes();
    reply.status(200).send(integracoes);
  });
  fastify.put(
    "/createIntegration/:integracaoId",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { integrationName, settings, clientId, isActive } =
        request.body as any;

      const config = await integracaoService.createOrUpdateIntegrationConfig(
        integrationName,
        settings,
        clientId,
        isActive,
      );
      reply.status(200).send(config);
    },
  );
  fastify.delete(
    "/:integracaoId",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { integracaoId } = request.params as any;
      const deleteData =
        await integracaoService.deleteIntegrationService(integracaoId);
      reply.status(200).send(deleteData);
    },
  );
  fastify.post(
    "/:channelId/:clientId/:integrationName",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { channelId, clientId, integrationName } = request.params as any;
      const body = request.body as any;

      await checkIntegration({
        channelId,
        clientId,
        integrationName,
        ...body,
      });
      reply.status(200).send({ success: true });
    },
  );
}
