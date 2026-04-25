import { Whatsapp } from "../../generated/prisma/client";
import { ChannelsRepository } from "./channlesRepository";


export class ChannelsService {
  private channelsRepository: ChannelsRepository;
  constructor() {
    this.channelsRepository = new ChannelsRepository();   
  }
  /**
   * Retorna uma lista de todas as conexões de WhatsApp.
   *
   * @returns {Promise<Whatsapp[]>} Um array com todas as conexões. Retorna um array vazio se não houver nenhuma.
   */
  async findAll(): Promise<Whatsapp[]> {
    return this.channelsRepository.findMany();
  }
}