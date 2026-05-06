import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { IntegracaoService } from "./integrationConfig.service.js";
import { checkIntegration } from "./Helpers/checkIntegration.js";

const integracaoService = new IntegracaoService();
export async function integrationController(fastify: FastifyInstance) {
  fastify.post(
    "/createIntegration",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { integrationName, settings, clientId } = request.body as any;
      try {
        const config = await integracaoService.createOrUpdateIntegrationConfig(
          integrationName,
          settings,
          clientId,
        );
        reply.status(200).send(config);
      } catch (error) {
        // Captura a mensagem específica do erro
        let errorMessage = "Erro interno ao criar integracao";
        let statusCode = 500;

        if (error instanceof Error) {
          errorMessage = error.message;
        }

        return reply.status(statusCode).send({
          success: false,
          error: errorMessage,
          statusCode: statusCode,
        });
      }
    },
  );
  fastify.post(
    "/:channelId/:clientId/:integrationName",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { channelId, clientId, integrationName } = request.params as any;
        const body = request.body as any;

        await checkIntegration({
          channelId,
          clientId,
          integrationName,
          ...body,
        });
        reply.status(200).send("Ok");
      } catch (error) {
        // Captura a mensagem específica do erro
        let errorMessage = "Erro interno ao enviar mensagem";
        let statusCode = 500;

        if (error instanceof Error) {
          errorMessage = error.message; // "Erro enviar mnesgam"

          // Você pode adicionar condições para diferentes tipos de erro
          if (
            errorMessage.includes("não conectado") ||
            errorMessage.includes("not connected")
          ) {
            statusCode = 400;
          } else if (errorMessage.includes("número inválido")) {
            statusCode = 400;
          }
        }

        return reply.status(statusCode).send({
          success: false,
          error: errorMessage,
          statusCode: statusCode,
        });
      }
    },
  );
}
