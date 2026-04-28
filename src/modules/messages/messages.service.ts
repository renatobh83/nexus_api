import { Prisma } from "../../generated/prisma/client";
import { waitForSocket } from "../../lib/socket";
import { SendMessageSystemProxy } from "../wppWeb/handleSendMessageSystemProxy";
import { buildMessageBody } from "./message.utils";
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
    const io = await waitForSocket();
    io.emit("new-message", message);
    return message;
  }

  async findMessagesTicket(where: Prisma.MessageWhereInput) {
    return await this.messageRepository.findAllMessageTicket(where);
  }

  async createMessageSystem(data: any) {
    const body = buildMessageBody(data.message.body, data.ticket);
    await Promise.all(
      (data.filesArray && data.filesArray.length
        ? data.filesArray
        : [null]
      ).map(async (media: string) => {
        SendMessageSystemProxy(body, data.ticket, media);
      }),
    );
  }
}
