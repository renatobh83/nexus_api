import { Message, Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

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
  create(dto: Prisma.MessageCreateInput) {
    return prisma.message.create({ data: dto, include: messageInclude });
  }

  async findMessage(
    where: Prisma.MessageWhereInput,
    include?: Prisma.MessageInclude,
  ): Promise<Message | null> {
    return await prisma.message.findFirst({ where, include: messageInclude });
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
      include: messageInclude,
    });
    const count = messages.length;
    const hasMore = count > DEFAULT_SKIP + messages.length;
    const safeMessages = messages.map(({ ticket, ...rest }) => rest);
    return {
      messages: safeMessages.reverse(),
      hasMore,
      count,
    };
  }
}
