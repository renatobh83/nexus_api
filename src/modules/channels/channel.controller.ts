import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ChannelService } from "./channel.services";

export async function channelController(fastify: FastifyInstance) {
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const service = new ChannelService();
    const channels = await service.listaAllChannles();
    reply.status(200).send(channels);
  });
  /**
   * Cria um novo canal na apliacação
   */
  fastify.post("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = {
      ...(request.body as any),
      status: "DISCONNECTED",
    };
    const service = new ChannelService();
    const channel = await service.create(payload);
    reply.status(200).send(channel);
  });
}
