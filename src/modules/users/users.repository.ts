import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export class UsersRepository {
  create(data: Prisma.UserCreateInput) {
    return prisma.user.create({ data: data });
  }
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email: email } });
  }
  updateUser(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({ where: { id: id }, data });
  }
  deactivateUser(id: string) {
    return prisma.user.updateMany({
      where: { id },
      data: {
        isActive: false,
        isOnline: false,
        lastLogout: new Date(),
      },
    });
  }
  listaAll() {
    return prisma.user.findMany({
      select: {
        id: true,
        name: true,
        isActive: true,
        role: true,
        email: true,
      },
    });
  }
}
