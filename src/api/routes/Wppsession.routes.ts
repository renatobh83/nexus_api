import { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";

import { ChannelService } from "../../modules/channels/channel.service.js";
import { getSessionMemoryInfo, restartWppWeb } from "../../providers/whatsapp-web/wpp-web/Wpp-web.js";


const channelService = new ChannelService(); // ajuste se você já tiver uma instância compartilhada (DI)

interface ChannelIdParams {
  id: string;
}

const wppSessionRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * GET /channels/:id/wpp-memory
   * Retorna o consumo de memória atual do Chrome daquela sessão.
   * Front pode chamar isso periodicamente (ex: a cada 30s) pra exibir no dashboard
   * e decidir se mostra alerta / habilita o botão de restart.
   */
  fastify.get(
    "/channels/:id/wpp-memory",
    async (request: FastifyRequest<{ Params: ChannelIdParams }>, reply: FastifyReply) => {
      try {
        const channelId = Number(request.params.id);
        const info = await getSessionMemoryInfo(channelId);
        return reply.send(info);
      } catch (error) {
        request.log.error(error, "Erro ao consultar memória da sessão");
        return reply.status(500).send({ error: "Erro ao consultar memória da sessão" });
      }
    },
  );

  /**
   * POST /channels/:id/wpp-restart
   * Fecha o Chrome da sessão e reinicia, reaproveitando o userDataDir
   * (não pede QR de novo). Use no botão "Reiniciar sessão" do front.
   */
  fastify.post(
    "/channels/:id/wpp-restart",
    async (request: FastifyRequest<{ Params: ChannelIdParams }>, reply: FastifyReply) => {
      try {
        const channelId = Number(request.params.id);

        // ajuste o método abaixo conforme o que existir no seu ChannelService
        // (ex: findById, findOne, getById...)
        
        const channel = await (channelService as any).findChannelOrThrow(channelId);

        if (!channel) {
          return reply.status(404).send({ error: "Canal não encontrado" });
        }

        // não espera terminar de subir pra não travar a requisição (create() pode
        // demorar alguns segundos); responde de imediato e deixa rodando em background
        restartWppWeb(channel, channelService).catch((error) => {
          request.log.error(error, `Erro ao reiniciar sessão ${channel.name}`);
        });

        return reply.status(202).send({ message: "Restart da sessão disparado" });
      } catch (error) {
        request.log.error(error, "Erro ao disparar restart da sessão");
        return reply.status(500).send({ error: "Erro ao disparar restart da sessão" });
      }
    },
  );
};

export default wppSessionRoutes;