import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { IntegracaoService } from "./integrationConfig.service.js";
import { checkIntegration } from "../../integrations/genesis/services/scheduling_api/Helpers/checkIntegration.js";
import { AppError } from "../../utils/AppError.js";
import { parseIntegrationConfigId } from "./integrationConfig.security.js";
import {
  ChannelParams,
  ExternalNotificationBody,
} from "./integrationConfig.types.js";

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
  fastify.post<{
    Params: ChannelParams;
    Body: ExternalNotificationBody;
  }>(
    "/:channelId/notifications/whatsapp",
    {
      schema: {
        params: {
          type: "object",
          required: ["channelId"],
          additionalProperties: false,
          properties: {
            channelId: {
              type: "string",
              pattern: "^[1-9][0-9]*$",
            },
          },
        },
        headers: {
          type: "object",
          required: ["x-api-key"],
          properties: {
            "x-api-key": {
              type: "string",
              minLength: 16,
              maxLength: 200,
            },
          },
        },
        body: {
          type: "object",
          required: ["event", "occurredAt", "recipient"],
          additionalProperties: true,
          properties: {
            event: {
              type: "string",
              minLength: 1,
              maxLength: 100,
            },
            occurredAt: {
              type: "string",
              format: "date-time",
            },
            recipient: {
              type: "string",
              minLength: 1,
              maxLength: 100,
            },
          },
        },
      },
    },
    async (request, reply) => {
      const channelId = Number(request.params.channelId);
      const apiKey = request.headers["x-api-key"];
      const expected = process.env.WHATSAPP_API_KEY;
      if (apiKey !== expected) {
        return reply
          .status(401)
          .send({ success: false, error: "unauthorized" });
      }
      const result = await integracaoService.notificationsApiExternal(
        request.body,
        channelId,
      );
      const statusCode = result.success ? 200 : 422;
      return reply.status(statusCode).send(result);
    },
  );
  fastify.get("/boletim", async (request, reply) => {
    const API_KEY = process.env.API_KEY_BOLETIM || "";
    const BOLETIM_URL = process.env.BOLETIM_URL || "";

    if (!API_KEY) {
      return reply.status(401).send({ success: false, error: "unauthorized" });
    }
    if (!BOLETIM_URL) {
      return reply
        .status(404)
        .send({ success: false, error: "URL BOLETIM NÃO CADSTRADA" });
    }
    const res = await fetch(`${BOLETIM_URL}/run-now`, {
      method: "POST",
      headers: {
        "X-API-Key": API_KEY,
      },
      signal: AbortSignal.timeout(60000), // 60 segundos
    });
    const result = await res.json();

    const statusCode = result.published ? 200 : 422;
    return reply.status(statusCode).send(result);
  });
}
