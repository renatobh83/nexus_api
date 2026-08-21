import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export class TicketsRepository {
  async findAll(where?: Prisma.TicketWhereInput) {
    return await prisma.ticket.findMany({
      where,
      include: {
        messages: {
          orderBy: {
            createdAt: "desc", // ou id: "asc"
          },
        },
      },
    });
  }
  async findTicket(where: Prisma.TicketWhereInput) {
    return await prisma.ticket.findFirst({
      where,
      select: {
        id: true,
        status: true,
        channelId: true,
        contato: true,
        socketId: true,
        userId: true,
        channel: {
          select: {
            name: true,
            type: true,
          },
        },
      },
    });
  }
  async findByField(where: Prisma.TicketWhereInput) {
    return await prisma.ticket.findFirst({ where });
  }
  // async findByField(where: Prisma.TicketWhereInput) {
  //   return await prisma.ticket.findFirst({
  //     where,
  //     orderBy: {
  //       createdAt: "desc",
  //     },
  //     include: {
  //       messages: {
  //         orderBy: {
  //           createdAt: "desc", // ou id: "asc"
  //         },
  //       },
  //       channel: {
  //         select: {
  //           name: true,
  //           type: true,
  //         },
  //       },
  //     },
  //   });
  // }
  async updateTicket(ticketId: number, data: Prisma.TicketUpdateInput) {
    return await prisma.ticket.update({
      where: {
        id: ticketId,
      },
      data: data,
    });
  }

  async create(data: Prisma.TicketCreateInput): Promise<any> {
    return await prisma.ticket.create({
      data: data,
      include: {
        messages: {
          orderBy: {
            createdAt: "desc", // ou id: "asc"
          },
        },
      },
    });
  }
  /**
   * Persiste a mensagem e a atualização resumida do ticket no mesmo commit.
   * Assim, uma falha em qualquer uma das operações não deixa mensagem órfã
   * nem ticket atualizado sem a mensagem correspondente.
   */
  async createcreateMessageAndUpdateTicket(
    ticketId: number,
    updateTicket: Prisma.TicketUpdateInput,
    messageData: Prisma.MessageCreateInput,
  ) {
    return await prisma.$transaction(async (transaction) => {
      const message = await transaction.message.create({ data: messageData });
      const ticketUpdate = await transaction.ticket.update({
        where: {
          id: ticketId,
        },
        data: updateTicket,
      });

      return { ticketUpdate, message };
    });
  }
}
