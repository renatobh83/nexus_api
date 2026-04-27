import { Prisma } from "../../generated/prisma/client";
import { MessageRepository } from "./messages.repository";

export class MessageService {
  private messageRepository: MessageRepository;
  constructor() {
    this.messageRepository = new MessageRepository();
  }

  async createMessage(dto: Prisma.MessageCreateInput) {
    let bodyToDb = (dto.body ?? "").trim();
    if (bodyToDb === "") {
      bodyToDb = "Bot message - sem conteudo";
    }
    const { body, ...restDto } = dto;
    const messageData: Prisma.MessageCreateInput = {
      body: bodyToDb,
      ...restDto,
    };
    const message = await this.messageRepository.create(messageData);

    return message;
  }

  async findMessagesTicket(where: Prisma.MessageWhereInput) {
    return await this.messageRepository.findAllMessageTicket(where);
  }
}
