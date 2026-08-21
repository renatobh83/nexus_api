import {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { ChannelService } from "./channel.service.js";
import {
  parseChannelCreateData,
  parseChannelId,
  parseChannelMessageData,
  parseChannelUpdateData,
  toPublicChannel,
} from "./channel.security.js";
import { ChannelManager } from "./ChannelManager.js";
import { handleSendMessage } from "../messages/handlers/handleSendMessage.js";
import { readMultipartParts } from "../../utils/readMultipart.js";

const service = new ChannelService();
const channelManager = new ChannelManager();

type ChannelRouteParams = Readonly<{
  channelId: string;
}>;

type ChannelRequest = FastifyRequest<{
  Params: ChannelRouteParams;
  Body: unknown;
}>;

function invalidChannelInput(reply: FastifyReply): FastifyReply {
  return reply.status(400).send({ message: "Invalid channel input" });
}

export async function channelController(fastify: FastifyInstance) {
  fastify.get("/", async (_request: FastifyRequest, reply: FastifyReply) => {
    const channels = await service.listaAllChannels();
    reply.status(200).send(channels.map(toPublicChannel));
  });

  fastify.get<{ Params: ChannelRouteParams }>(
    "/:channelId",
    { preHandler: fastify.authorizeRoles("administrador") },
    async (request: ChannelRequest, reply: FastifyReply) => {
      const id = parseChannelId(request.params.channelId);
      if (!id) {
        return reply.status(400).send({ message: "Invalid channel id" });
      }

      const channel = await service.findChannel(id);
      if (!channel) {
        return reply.status(404).send({ message: "Channel not found" });
      }

      reply.status(200).send(toPublicChannel(channel));
    },
  );

  /** Atualiza somente os campos funcionais permitidos de um canal. */
  fastify.put<{ Params: ChannelRouteParams; Body: unknown }>(
    "/:channelId",
    { preHandler: fastify.authorizeRoles("administrador") },
    async (request: ChannelRequest, reply: FastifyReply) => {
      const id = parseChannelId(request.params.channelId);
      if (!id) {
        return reply.status(400).send({ message: "Invalid channel id" });
      }

      const data = parseChannelUpdateData(request.body);
      if (!data) return invalidChannelInput(reply);

      const channel = await service.update(id, data);
      reply.status(200).send(toPublicChannel(channel));
    },
  );

  /** Cria um canal com nome, tipo e configurações funcionais validados. */
  fastify.post<{ Body: unknown }>(
    "/",
    { preHandler: fastify.authorizeRoles("administrador") },
    async (request, reply: FastifyReply) => {
      const data = parseChannelCreateData(request.body);
      if (!data) return invalidChannelInput(reply);

      const channel = await service.create({
        ...data,
        status: "DISCONNECTED",
      });

      reply.status(200).send(toPublicChannel(channel));
    },
  );

  /** Abre a conexão do canal após validar o identificador da rota. */
  fastify.post<{ Params: ChannelRouteParams }>(
    "/:channelId/connect",
    { preHandler: fastify.authorizeRoles("administrador") },
    async (request: ChannelRequest, reply: FastifyReply) => {
      const id = parseChannelId(request.params.channelId);
      if (!id) {
        return reply.status(400).send({ message: "Invalid channel id" });
      }

      await channelManager.startSession(id);
      reply.status(200).send();
    },
  );

  /** Envia texto ou mídia após validar campos, tamanho e destinatário. */
  fastify.post<{ Params: ChannelRouteParams; Body: unknown }>(
    "/:channelId/send",
    async (request: ChannelRequest, reply: FastifyReply) => {
      const id = parseChannelId(request.params.channelId);
      if (!id) {
        return reply.status(400).send({ message: "Invalid channel id" });
      }

      let filesArray: Array<{
        filename: string;
        mimetype: string;
        buffer: Buffer;
      }> = [];
      let fields: Record<string, unknown> = {};

      if (request.isMultipart()) {
        const parsedParts = await readMultipartParts(request.parts());
        filesArray = parsedParts.files;
        fields = parsedParts.fields;
      } else {
        fields = request.body && typeof request.body === "object"
          ? (request.body as Record<string, unknown>)
          : {};
      }

      const channel = await service.findChannelOrThrow(id);
      const messageData = parseChannelMessageData(fields, channel.type);
      if (
        !messageData ||
        (!filesArray.length && messageData.body.trim().length === 0)
      ) {
        return reply.status(400).send({ message: "Invalid message data" });
      }

      await Promise.all(
        (filesArray.length ? filesArray : [null]).map((media) =>
          handleSendMessage(channel, messageData.to, messageData.body, media),
        ),
      );
      reply.status(200).send("ok");
    },
  );
}
