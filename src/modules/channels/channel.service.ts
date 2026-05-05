import { Channel, Prisma } from "@prisma/client";
import { ChannelsRepository } from "./channel.repository.js";
import { waitForSocket } from "../../lib/socket.js";
import { handleSendMessage } from "../messages/handlers/handleSendMessage.js";

export class ChannelService {
  private channelsRepository: ChannelsRepository;
  constructor() {
    this.channelsRepository = new ChannelsRepository();
  }
  /**
   * Retorna uma lista de todas as conexões de WhatsApp.
   *
   * @returns {Promise<Whatsapp[]>} Um array com todas as conexões. Retorna um array vazio se não houver nenhuma.
   */
  async findAll(): Promise<Channel[]> {
    return this.channelsRepository.findMany();
  }
  async listaAllChannels(): Promise<Channel[]> {
    return await this.channelsRepository.listaAll();
  }
  async findChannel(id: number): Promise<Channel | null> {
    return await this.channelsRepository.findById(id);
  }
  async update(id: number, data: Prisma.ChannelUpdateInput): Promise<Channel> {
    try {
      const io = await waitForSocket();
      io.emit(`channel-update`, {
        id,
        ...data,
      });
      return await this.channelsRepository.udpateChannel(id, data);
    } catch (error) {
      throw error;
    }
  }

  async create(data: Prisma.ChannelCreateInput) {
    return await this.channelsRepository.create(data);
  }

  async sendMessageToChannel(
    message: Record<string, any>,
    filesArray: any[],
    id: number,
  ) {
    try {
      const channel = await this.channelsRepository.findById(id);
      if (!channel) {
        throw new Error("CHANNEL_NO_FOUND");
      }

      const { to, body } = message;
      const enviarPara = `+55${to}`;
      await Promise.all(
        (filesArray && filesArray.length ? filesArray : [null]).map(
          async (media: string) => {
            await handleSendMessage(channel, enviarPara, body, media);
          },
        ),
      );
    } catch (error) {
      throw error;
    }
  }
}
