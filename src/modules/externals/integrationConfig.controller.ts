import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { IntegracaoService } from "./integrationConfig.service.js";
import { checkIntegration } from "../../integrations/genesis/services/scheduling_api/Helpers/checkIntegration.js";
import { AppError } from "../../utils/AppError.js";
import { parseIntegrationConfigId } from "./integrationConfig.security.js";

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
    const { clientId } = request.query as { clientId?: unknown };
    if (clientId !== undefined && typeof clientId !== "string") {
      throw new AppError("clientId inválido", 400);
    }

    const integracoes = await integracaoService.loadIntegracoes(clientId);
    reply.status(200).send(integracoes);
  });
  fastify.put(
    "/createIntegration/:integracaoId",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { integracaoId } = request.params as { integracaoId?: unknown };
      const id = parseIntegrationConfigId(integracaoId);
      if (!id) {
        throw new AppError("ID de integração inválido", 400);
      }

      const { integrationName, settings, clientId, isActive } =
        request.body as any;

      const config = await integracaoService.updateIntegrationConfigById(
        id,
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
      const { integracaoId } = request.params as { integracaoId?: unknown };
      const id = parseIntegrationConfigId(integracaoId);
      if (!id) {
        throw new AppError("ID de integração inválido", 400);
      }

      const deleteData = await integracaoService.deleteIntegrationService(id);
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
