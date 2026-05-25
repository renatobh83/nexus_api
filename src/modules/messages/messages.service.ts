import { Prisma } from "@prisma/client";
import { getClientIONamespace, waitForSocket } from "../../lib/socket.js";
import { buildMessageBody } from "./message.utils.js";
import { MessageRepository } from "./messages.repository.js";
import { SendMessageSystemProxy } from "./handlers/handleSendMessageSystemProxy.js";

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
    const clientNamespace = getClientIONamespace();
    // DIAGNÓSTICO: Verificar quem está na sala
    const roomName = `ticket-${message.ticketid}`;
    // const connectedSockets = await clientNamespace.in(roomName).fetchSockets();

    // console.log(`📊 Sala: ${roomName}`);
    // console.log(`👥 Sockets conectados nesta sala: ${connectedSockets.length}`);

    clientNamespace.to(roomName).emit("new-message", {
      ...message,
      ack: 2,
    });

    return message;
  }

  async findMessagesTicket(where: Prisma.MessageWhereInput) {
    return await this.messageRepository.findAllMessageTicket(where);
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
}
