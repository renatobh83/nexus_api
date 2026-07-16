import { Message, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export interface ResponseMessages {
  messages: Message[];
  count: number;
  hasMore: boolean;
}
const messageInclude = {
  ticket: {
    include: {
      messages: {
        orderBy: {
          createdAt: "asc", // ou id: "asc"
        },
      },
    },
  },
} satisfies Prisma.MessageInclude;
export class MessageRepository {
  async create(dto: Prisma.MessageCreateInput) {
    return await prisma.message.upsert({
      where: { messageId: dto.messageId },
      update: dto,
      create: dto,
    });
    // return prisma.message.create({ data: dto });
  }

  async findMessage(
    where: Prisma.MessageWhereInput,
    include?: Prisma.MessageInclude,
  ): Promise<Message | null> {
    return await prisma.message.findFirst({ where, include: messageInclude });
  }
  async findForUpdateMessage(messageId: string) {
    return await prisma.message.findFirst({
      where: {
        messageId: messageId,
      },
    });
  }
  async updateMessage(messaegId: string, data: Prisma.MessageUpdateInput) {
    return prisma.message.update({
      where: {
        messageId: messaegId,
      },

      data: data,
    });
  }
  async findAllMessageTicket(where: Prisma.MessageWhereInput): Promise<any> {
    const DEFAULT_LIMIT = 40;
    const DEFAULT_SKIP = 0;
    const messages = await prisma.message.findMany({
      take: DEFAULT_LIMIT,
      skip: DEFAULT_SKIP,
      where,
      orderBy: {
        createdAt: "desc",
      },
    });
    const count = messages.length;
    const hasMore = count > DEFAULT_SKIP + messages.length;

    return {
      messages, //: JSON.parse(JSON.stringify(messages)),
      hasMore,
      count,
    };
  }
}
