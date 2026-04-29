import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ChannelService } from "./channel.services.js";
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
}
