import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export class ChannelsRepository {
  /**
   * Cria uma nova conexão de WhatsApp no banco de dados.
   * @param data - Os dados já formatados no tipo Prisma.WhatsappCreateInput.
   */
  async create(data: Prisma.ChannelCreateInput) {
    // Agora sim, está correto. 'data' já está no formato que o Prisma entende.
    return prisma.channel.create({
      data: data,
    });
  }

  /**
   * Atualiza um canal
   * @returns retorna o canal atualizado
   */
  async udpateChannel(id: number, data: Prisma.ChannelUpdateInput) {
    try {
      return await prisma.channel.update({
        where: { id },
        data,
      });
    } catch (error: any) {
      if (error.code === "P2025") {
        throw new Error("Channel não encontrado");
      }
      throw error;
    }
  }

  /**
   * Lista todos os canais no banco de dados
   * @returns retorna os canais cadastrados
   */
  async findMany() {
    return prisma.channel.findMany({
      where: {
        isActive: true,
        status: {
          notIn: ["DISCONNECTED"],
        },
        OR: [
          // Condição 3.A: O tipo é um dos canais que não dependem de QR Code.
          {
            type: {
              in: ["instagram", "telegram", "waba", "messenger"],
            },
          },
          // Condição 3.B: OU o tipo é 'whatsapp' E seu status está pronto.
          {
            type: "whatsapp",
            status: {
              notIn: ["DISCONNECTED", "qrcode"],
            },
          },
        ],
      },
    });
  }
  async listaAll() {
    return await prisma.channel.findMany();
  }
}
