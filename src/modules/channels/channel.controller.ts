import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ChannelService } from "./channel.services.js";
const service = new ChannelService();
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
}
