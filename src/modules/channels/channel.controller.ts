import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ChannelService } from "./channel.service.js";
import { ChannelManager } from "./ChannelManager.js";
import { handleSendMessage } from "../messages/handlers/handleSendMessage.js";
import { readMultipartParts } from "../../utils/readMultipart.js";

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

      let filesArray: Array<{
        filename: string;
        mimetype: string;
        buffer: Buffer;
      }> = [];

      let fields: Record<string, any> = {};

      if (request.isMultipart()) {
        const parsedParts = await readMultipartParts(request.parts());
        filesArray = parsedParts.files;
        fields = parsedParts.fields;
      } else {
        fields = request.body as any;
      }
      const { to, body } = fields;
      const channel = await service.findChannelOrThrow(id);
      const enviarPara = to.includes("@") ? to : `+55${to}`;

      await Promise.all(
        (filesArray.length ? filesArray : [null]).map(async (media) => {
          await handleSendMessage(channel, enviarPara, body, media);
        }),
      );
      reply.status(200).send("ok");
    },
  );
}
