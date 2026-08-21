import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
} from "fastify";

import { ChannelService } from "../../modules/channels/channel.service.js";
import {
  getSessionMemoryInfo,
  restartWppWeb,
} from "../../providers/whatsapp-web/wpp-web/Wpp-web.js";
import { AppError } from "../../utils/AppError.js";
import { parseChannelId } from "./wppSession.security.js";

const channelService = new ChannelService();

interface ChannelIdParams {
  id: string;
}

/** Registra operações administrativas de diagnóstico e reinício do WhatsApp Web. */
const wppSessionRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  /**
   * GET /channels/:id/wpp-memory
   * Retorna o consumo de memória atual do Chrome daquela sessão.
   */
  fastify.get(
    "/channels/:id/wpp-memory",
    async (
      request: FastifyRequest<{ Params: ChannelIdParams }>,
      reply: FastifyReply,
    ) => {
      const channelId = parseChannelId(request.params.id);
      if (!channelId) {
        throw new AppError("ID de canal inválido", 400);
      }

      const channel = await channelService.findChannel(channelId);
      if (!channel) {
        throw new AppError("Canal não encontrado", 404);
      }

      const info = await getSessionMemoryInfo(channelId);
      return reply.send(info);
    },
  );

  /**
   * POST /channels/:id/wpp-restart
   * Fecha o Chrome da sessão e reinicia, reaproveitando o userDataDir.
   */
  fastify.post(
    "/channels/:id/wpp-restart",
    async (
      request: FastifyRequest<{ Params: ChannelIdParams }>,
      reply: FastifyReply,
    ) => {
      const channelId = parseChannelId(request.params.id);
      if (!channelId) {
        throw new AppError("ID de canal inválido", 400);
      }

      const channel = await channelService.findChannel(channelId);
      if (!channel) {
        throw new AppError("Canal não encontrado", 404);
      }

      // Não espera a inicialização completa para não bloquear a requisição.
      restartWppWeb(channel, channelService).catch((error) => {
        request.log.error(
          { error, channelId },
          `Erro ao reiniciar sessão ${channel.name}`,
        );
      });

      return reply.status(202).send({ message: "Restart da sessão disparado" });
    },
  );
};

export default wppSessionRoutes;
