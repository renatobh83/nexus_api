import { Message, Prisma } from "@prisma/client";
import { AppError } from "../../utils/AppError.js";
import { getClientIONamespace, waitForSocket } from "../../lib/socket.js";
import { buildMessageBody } from "./message.utils.js";
import { MessageRepository } from "./messages.repository.js";
import type { MessagePagination } from "./messages.repository.js";
import { SendMessageSystemProxy } from "./handlers/handleSendMessageSystemProxy.js";
import { TicketsRepository } from "../tickets/tickets.repository.js";

export class MessageService {
  private messageRepository: MessageRepository;
  private ticketsRepository: TicketsRepository;
  constructor() {
    this.messageRepository = new MessageRepository();
    this.ticketsRepository = new TicketsRepository();
  }

  /**
   * Emite a mensagem já persistida para o painel, consultando o ticket apenas
   * depois do commit para evitar que clientes recebam dados de uma operação
   * que ainda possa sofrer rollback.
   */
  async notifyMessageCreated(message: Message, ticketId: number) {
    const clientNamespace = getClientIONamespace();
    const ticket = await this.ticketsRepository.findTicket({
      id: ticketId,
    });

    if (ticket && ticket.userId) {
      clientNamespace.to(`user-${ticket.userId}`).emit("new-message", {
        ...message,
        ack: 2,
      });
    } else {
      // Se não tem usuário atribuído, talvez enviar para todos os atendentes "livres"
      clientNamespace.emit("new-message", {
        ...message,
        ack: 2,
      });
    }
  }

  /**
   * Persiste uma mensagem fora de uma transação de ticket e conserva o
   * comportamento legado dos workers e das integrações existentes.
   */
  async createMessage(dto: Prisma.MessageCreateInput) {
    let bodyToDb = (dto.body ?? "").trim();
    if (bodyToDb === "") {
      bodyToDb = "Bot message - sem conteudo";
    }
    const { body, ...restDto } = dto;
    const ticketId = dto.ticket.connect?.id;
    if (typeof ticketId !== "number") {
      throw new AppError("A mensagem precisa estar associada a um ticket", 400);
    }

    const messageData: Prisma.MessageCreateInput = {
      body: bodyToDb,
      ...restDto,
    };
    const message = await this.messageRepository.create(messageData);

    await this.notifyMessageCreated(message, ticketId);

    return message;
  }

  async findMessagesTicket(
    where: Prisma.MessageWhereInput,
    pagination?: MessagePagination,
  ) {
    return await this.messageRepository.findAllMessageTicket(where, pagination);
  }

  async createMessageSystem(data: any) {
    const body = buildMessageBody(data.message.body, data.ticket);

    return await Promise.all(
      (data.filesArray && data.filesArray.length
        ? data.filesArray
        : [null]
      ).map(async (media: string) => {
        return SendMessageSystemProxy(body, data.ticket, media);
      }),
    );
  }
  async findMessageForUpdate(messageId: string) {
    return this.messageRepository.findForUpdateMessage(messageId);
  }
  async updateMessage(messageId: string, data: Prisma.MessageUpdateInput) {
    const clientNamespace = getClientIONamespace();
    const updated = await this.messageRepository.updateMessage(messageId, data);
    clientNamespace.emit("chat:update", {
      ...updated,
    });
  }
}
