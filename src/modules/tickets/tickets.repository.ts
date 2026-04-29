import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export class TicketsRepository {
  async findAll() {
    return await prisma.ticket.findMany({
      include: {
        messages: {
          orderBy: {
            createdAt: "desc", // ou id: "asc"
          },
        },
      },
    });
  }
  async findByField(where: Prisma.TicketWhereInput) {
    return await prisma.ticket.findFirst({
      where,
      orderBy: {
        createdAt: "desc", // Ordena do mais recente para o mais antigo
      },
      include: {
        messages: {
          orderBy: {
            createdAt: "desc", // ou id: "asc"
          },
        },
        channel: {
          select: {
            name: true,
            type: true,
          },
        },
      },
    });
  }
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
}
