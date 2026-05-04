import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ChannelService } from "./channel.service.js";
import { ChannelManager } from "./ChannelManager.js";

const service = new ChannelService();
const channelManager = new ChannelManager();

export async function channelController(fastify: FastifyInstance) {
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const channels = await service.listaAllChannles();
      reply.status(200).send(channels);
    } catch (error) {
      reply
        .status(500)
        .send({ message: `Erro interno ${JSON.stringify(error, null, 2)}` });
    }
  });
  /**
   * Cria um novo canal na apliacação
   */
  fastify.post("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const payload = {
        ...(request.body as any),
        status: "DISCONNECTED",
      };
      console.log(payload);
      const channel = await service.create(payload);

      reply.status(200); //.send("channel");
    } catch (error) {
      reply
        .status(500)
        .send({ message: `Erro interno ${JSON.stringify(error, null, 2)}` });
    }
  });

  // abre a conexao do canal
  fastify.post(
    "/:channelId/connect",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { channelId } = request.params as any;
        const id = parseInt(channelId);
        const channel = await channelManager.startSession(id);
        reply.status(200).send(channel);
      } catch (error) {
        reply
          .status(500)
          .send({ message: `Erro interno ${JSON.stringify(error, null, 2)}` });
      }
    },
  );

  fastify.post(
    "/:channelId/send",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { channelId } = request.params as any;
      try {
        const id = parseInt(channelId);

        let filesArray: any[] = [];

        let fields: Record<string, any> = {};

        if (request.isMultipart()) {
          const parts = request.parts();

          for await (const part of parts) {
            if (part.type === "file") {
              const buffer = await part.toBuffer();
              filesArray.push({
                filename: part.filename,
                mimetype: part.mimetype,
                buffer,
              });
            } else {
              fields[part.fieldname] = part.value;
            }
          }
        } else {
          fields = request.body as any;
        }

        await service.sendMessageToChannel(fields, filesArray, id);
        reply.status(200).send("ok");
      } catch (error) {
        console.error("Erro ao enviar mensagem:", error);

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
