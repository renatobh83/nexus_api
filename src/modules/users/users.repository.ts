import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import {
  AUTHENTICATION_USER_SELECT,
  PUBLIC_USER_SELECT,
  type AuthenticationUserRecord,
  type PublicUserRecord,
} from "./userSelections.js";

export class UsersRepository {
  create(data: Prisma.UserCreateInput): Promise<PublicUserRecord> {
    return prisma.user.create({
      data,
      select: PUBLIC_USER_SELECT,
    });
  }

  findByEmail(email: string): Promise<PublicUserRecord | null> {
    return prisma.user.findUnique({
      where: { email },
      select: PUBLIC_USER_SELECT,
    });
  }

  findByEmailForAuthentication(
    email: string,
  ): Promise<AuthenticationUserRecord | null> {
    return prisma.user.findUnique({
      where: { email },
      select: AUTHENTICATION_USER_SELECT,
    });
  }

  updateUser(id: string, data: Prisma.UserUpdateInput): Promise<PublicUserRecord> {
    return prisma.user.update({
      where: { id },
      data,
      select: PUBLIC_USER_SELECT,
    });
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

  listaAll(): Promise<PublicUserRecord[]> {
    return prisma.user.findMany({
      select: PUBLIC_USER_SELECT,
    });
  }
}
