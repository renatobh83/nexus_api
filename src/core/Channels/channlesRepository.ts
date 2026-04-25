import { prisma } from "../../lib/prisma";



export class ChannelsRepository {

/**
   * Lista todos os canais no banco de dados
   * @returns retorna os canais cadastrados
   */
  async findMany(
  ) {
    return prisma.whatsapp.findMany(
      {
        where: {
        isActive: true,
        status: {
          notIn: ["CONNECTED"],
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

        }
    }
  );
  }

}