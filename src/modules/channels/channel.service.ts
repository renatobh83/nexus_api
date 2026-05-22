import { Channel, Prisma } from "@prisma/client";
import { ChannelsRepository } from "./channel.repository.js";
import { waitForSocket } from "../../lib/socket.js";
import { Server } from "socket.io";

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
  async update(
    id: number,
    data: Prisma.ChannelUpdateInput,
    io?: Server,
  ): Promise<Channel> {
    try {
      io?.emit(`channel-update`, {
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

  async findChannelOrThrow(id: number) {
    try {
      const channel = await this.channelsRepository.findById(id);
      if (!channel) throw new Error("CHANNEL_NO_FOUND");
      return channel;
    } catch (error) {
      throw error;
    }
  }

  async findTicketWebChat(contato: string, socketid: string) {
    return await this.channelsRepository.findTicketForChatWeb(
      contato,
      socketid,
    );
  }
}
