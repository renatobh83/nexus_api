import { Message, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export interface ResponseMessages {
  messages: Message[];
  count: number;
  hasMore: boolean;
}

export interface MessagePagination {
  limit?: number;
  skip?: number;
}

const DEFAULT_MESSAGE_LIMIT = 40;
const MAX_MESSAGE_LIMIT = 100;

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
  async findAllMessageTicket(
    where: Prisma.MessageWhereInput,
    pagination: MessagePagination = {},
  ): Promise<ResponseMessages> {
    const requestedLimit = Number.isInteger(pagination.limit)
      ? pagination.limit!
      : DEFAULT_MESSAGE_LIMIT;
    const requestedSkip = Number.isInteger(pagination.skip)
      ? pagination.skip!
      : 0;
    const limit = Math.min(Math.max(requestedLimit, 1), MAX_MESSAGE_LIMIT);
    const skip = Math.max(requestedSkip, 0);

    const [messages, count] = await prisma.$transaction([
      prisma.message.findMany({
        take: limit,
        skip,
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
      prisma.message.count({ where }),
    ]);

    return {
      messages,
      count,
      hasMore: skip + messages.length < count,
    };
  }
}
