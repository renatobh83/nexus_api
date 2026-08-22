import type { Prisma } from "@prisma/client";

export const PUBLIC_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
} satisfies Prisma.UserSelect;

export const AUTHENTICATION_USER_SELECT = {
  ...PUBLIC_USER_SELECT,
  passwordHash: true,
} satisfies Prisma.UserSelect;

export type PublicUserRecord = Prisma.UserGetPayload<{
  select: typeof PUBLIC_USER_SELECT;
}>;

export type AuthenticationUserRecord = Prisma.UserGetPayload<{
  select: typeof AUTHENTICATION_USER_SELECT;
}>;
