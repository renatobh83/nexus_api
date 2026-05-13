import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ChannelService } from "./channel.service.js";
import { ChannelManager } from "./ChannelManager.js";

const service = new ChannelService();
const channelManager = new ChannelManager();

export async function channelController(fastify: FastifyInstance) {
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const channels = await service.listaAllChannels();
    reply.status(200).send(channels);
  });

  fastify.get(
    "/:channelId",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { channelId } = request.params as any;
      const id = parseInt(channelId);
      const channel = await service.findChannel(id);
      reply.status(200).send(channel);
    },
  );
  // Edita um canal
  fastify.put(
    "/:channelId",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { channelId } = request.params as any;
      const id = parseInt(channelId);
      const channel = await service.update(id, request.body as any);
      reply.status(200).send(channel);
    },
  );
  /**
   * Cria um novo canal na apliacação
   */
  fastify.post("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = {
      ...(request.body as any),
      status: "DISCONNECTED",
    };

    const channel = await service.create(payload);

    reply.status(200).send(channel);
  });

  // abre a conexao do canal
  fastify.post(
    "/:channelId/connect",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { channelId } = request.params as any;
      const id = parseInt(channelId);
      const channel = await channelManager.startSession(id);
      reply.status(200).send(channel);
    },
  );

  fastify.post(
    "/:channelId/send",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { channelId } = request.params as any;

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
    },
  );
}
