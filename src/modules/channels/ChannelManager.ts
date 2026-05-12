import { initTeleproto } from "../../providers/telegram/teleproto/tbotProto.js";
import { initWppWeb } from "../../providers/whatsapp-web/wpp-web/Wpp-web.js";
import { ChannelService } from "./channel.service.js";

export class ChannelManager {
  private channelService: ChannelService;
  constructor() {
    this.channelService = new ChannelService();
  }

  /**
   * Inicia as sessões de todas as conexões de WhatsApp ativas e prontas.
   *
   * Este método busca no banco de dados todas as conexões que estão em um
   * estado operacional (ativas, conectadas e não aguardando QR Code) e,
   * em seguida, itera sobre elas para iniciar suas respectivas sessões.
   * É ideal para ser chamado na inicialização do servidor ou em rotinas de
   * reconexão.
   *
   * @returns {Promise<void>} Uma Promise que resolve quando a tentativa de
   * iniciar todas as sessões for concluída.
   */
  async startAllReadySessions(): Promise<void> {
    const readyChannels = await this.channelService.findAll();

    await Promise.all(
      readyChannels.map(async (channel) => {
        try {
          if (channel.type === "whatsapp") {
            initWppWeb(channel, this.channelService);
          } else if (channel.type === "telegram") {
            // initTeleproto(channel, this.channelService);
          }
        } catch (error) {
          console.error(
            `ERROR: Falha ao iniciar a sessão para '${channel.name}' (ID: ${channel.id}).`,
            error,
          );
        }
      }),
    );
  }
  async startSession(id: number): Promise<void> {
    try {
      const channel = await this.channelService.update(id, {
        status: "OPENING",
      });
      if (channel.type === "whatsapp") {
        await initWppWeb(channel, this.channelService);
      }
      if (channel.type === "telegram") {
        await initTeleproto(channel, this.channelService);
      }
    } catch (error) {
      console.error(`Erro ao iniciar seção para ${id}`);
    }
  }
}
