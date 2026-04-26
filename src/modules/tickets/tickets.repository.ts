
import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

export class TicketsRepository {
    async findAll(){
        return await prisma.ticket.findMany()
    }
    async findByField(where: Prisma.TicketWhereInput){
        return await prisma.ticket.findFirst({
            where,
            orderBy: {
                createdAt: "desc", // Ordena do mais recente para o mais antigo
            },
        })
    }
    async updateTicket(ticketId: number, data:Prisma.TicketUpdateInput){
        return await prisma.ticket.update({
            where: {
                id: ticketId
            },
            data: data
        })
    }
    async create(data: Prisma.TicketCreateInput): Promise<any> {
    return await prisma.ticket.create({
      data: data,
    })
  }
}