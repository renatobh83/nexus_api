import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";

export class TicketsRepository {
  private readonly database: typeof prisma;

  /**
   * Permite usar o cliente global em produção e um cliente controlado nos
   * testes, sem alterar a forma padrão de construção do repository.
   */
  constructor(database: typeof prisma = prisma) {
    this.database = database;
  }

  async findAll(where?: Prisma.TicketWhereInput) {
    return await this.database.ticket.findMany({
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
    return await this.database.ticket.findFirst({
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
    return await this.database.ticket.findFirst({ where });
  }
  async updateTicket(ticketId: number, data: Prisma.TicketUpdateInput) {
    return await this.database.ticket.update({
      where: {
        id: ticketId,
      },
      data: data,
    });
  }

  async create(data: Prisma.TicketCreateInput): Promise<any> {
    return await this.database.ticket.create({
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
   * Cria um ticket e sua primeira mensagem no mesmo commit.
   * Se a mensagem falhar, o ticket recém-criado também é revertido.
   */
  async createTicketAndCreateMessage(
    ticketData: Prisma.TicketCreateInput,
    messageData: Prisma.MessageCreateWithoutTicketInput,
  ) {
    return await this.database.$transaction(async (transaction) => {
      const { messages: _messages, ...ticketDataWithoutMessages } = ticketData;
      const ticket = await transaction.ticket.create({
        data: ticketDataWithoutMessages,
      });
      const message = await transaction.message.create({
        data: {
          ...messageData,
          ticket: {
            connect: { id: ticket.id },
          },
        },
      });

      return { ticket, message };
    });
  }

  /**
   * Persiste a mensagem e a atualização resumida do ticket no mesmo commit.
   * Assim, uma falha em qualquer uma das operações não deixa mensagem órfã
   * nem ticket atualizado sem a mensagem correspondente.
   */
  async updateTicketAndCreateMessage(
    ticketId: number,
    updateTicket: Prisma.TicketUpdateInput,
    messageData: Prisma.MessageCreateWithoutTicketInput,
  ) {
    return await this.database.$transaction(async (transaction) => {
      const message = await transaction.message.upsert({
        where: {
          messageId: messageData.messageId,
        },
        update: messageData,
        create: {
          ...messageData,
          ticket: {
            connect: { id: ticketId },
          },
        },
      });

      if (message.ticketid !== ticketId) {
        throw new AppError("A mensagem já está associada a outro ticket", 409);
      }

      const ticket = await transaction.ticket.update({
        where: {
          id: ticketId,
        },
        data: updateTicket,
      });

      return { ticketUpdate: ticket, message };
    });
  }

  /**
   * Mantém o nome histórico para consumidores externos, mas direciona a
   * operação para a implementação transacional e usa o ticketId como fonte
   * de verdade para o vínculo da mensagem.
   */
  async createcreateMessageAndUpdateTicket(
    ticketId: number,
    updateTicket: Prisma.TicketUpdateInput,
    messageData: Prisma.MessageCreateInput,
  ) {
    const { ticket: _ticket, ...messageWithoutTicket } = messageData;

    return await this.updateTicketAndCreateMessage(
      ticketId,
      updateTicket,
      messageWithoutTicket,
    );
  }
}
