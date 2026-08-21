import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { isChatSessionId } from "../chatWeb/chatWeb.security.js";

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
              in: ["instagram", "telegram", "waba", "messenger", "web"],
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

  async findById(id: number) {
    return await prisma.channel.findFirst({
      where: {
        id: id,
      },
    });
  }

  /**
   * Reassocia uma conexão somente ao ticket que contém a sessão UUID emitida
   * no token verificado. O filtro da atualização repete a prova de posse para
   * evitar que um ticket alterado entre a leitura e a troca do socket seja
   * reassumido por uma sessão diferente.
   */
  async findTicketForChatWeb(socketId: string, chatSessionId: string) {
    if (!isChatSessionId(chatSessionId)) return null;

    return prisma.$transaction(async (transaction) => {
      const ticket = await transaction.ticket.findFirst({
        where: {
          chatClient: true,
          status: {
            notIn: ["closed"],
          },
          metadata: {
            path: ["chatSessionId"],
            equals: chatSessionId,
          },
        },
        select: {
          id: true,
        },
      });

      if (!ticket) return null;

      const rebound = await transaction.ticket.updateMany({
        where: {
          id: ticket.id,
          chatClient: true,
          status: {
            notIn: ["closed"],
          },
          metadata: {
            path: ["chatSessionId"],
            equals: chatSessionId,
          },
        },
        data: {
          updatedAt: new Date(),
          socketId,
        },
      });

      // Se a prova deixou de corresponder, não devolve mensagens de outro
      // vínculo e deixa o callback transacional ser concluído sem alteração.
      if (rebound.count !== 1) return null;

      return transaction.ticket.findUnique({
        where: {
          id: ticket.id,
        },
        include: {
          messages: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });
    });
  }
}
