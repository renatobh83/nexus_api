import { Channel, Prisma } from "@prisma/client";
import { ChannelsRepository } from "./channel.repository.js";
import { waitForSocket } from "../../lib/socket.js";

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
  async listaAllChannles(): Promise<Channel[]> {
    return await this.channelsRepository.listaAll();
  }
  async update(id: number, data: Prisma.ChannelUpdateInput): Promise<Channel> {
    try {
      const io = await waitForSocket();
      io.emit(`channel-update`, {
        id,
        ...data,
      });
      console.log("Update Emit");
      return await this.channelsRepository.udpateChannel(id, data);
    } catch (error) {
      throw error;
    }
  }

  async create(data: Prisma.ChannelCreateInput) {
    return await this.channelsRepository.create(data);
  }
}
