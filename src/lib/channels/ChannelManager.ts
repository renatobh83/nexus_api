import { ChannelsService } from "../../core/Channels/channelsServices";


export class ChannelManager {

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
  async startAllReadySessions(): Promise<void>{
    const channelService = new ChannelsService()
    const readyChannels = await channelService.findAll()
    

     await Promise.all(
      readyChannels.map(async (channel) => {
        try {

          console.log(channel)
          
        } catch (error) {
          console.error(
            `ERROR: Falha ao iniciar a sessão para '${channel.name}' (ID: ${channel.id}).`,
            error
          );
        }
      })
    );
    // Aqui entra o código real de conexão (ex: usar venom-bot, whatsapp-web.js, etc.)
    // await new Promise(resolve => setTimeout(resolve, 100));
    // await initWppWeb("Wpp")
    // const w = await prisma.whatsapp.findMany()
    // console.log(w)
    // console.log('WhatsApp conectado!');
  }
}