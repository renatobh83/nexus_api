import { Prisma } from "@prisma/client";
import { compare, hash } from "bcryptjs";
import { AppError } from "../../utils/AppError.js";
import { UsersRepository } from "./users.repository.js";
import {
  SelfProfileUpdateData,
  UserCreateData,
  UserUpdateData,
} from "./users.security.js";

export class UsersService {
  private usersRepository: UsersRepository;

  constructor() {
    this.usersRepository = new UsersRepository();
  }

  createUser = async (data: UserCreateData) => {
    const userData: Prisma.UserCreateInput = {
      name: data.name,
      email: data.email,
      role: data.role,
      ...(data.isActive === undefined ? {} : { isActive: data.isActive }),
      ...(data.passwordHash === undefined
        ? {}
        : { passwordHash: await hash(data.passwordHash, 8) }),
    };

    return await this.usersRepository.create(userData);
  };

  updateUser = async (userId: string, data: UserUpdateData) => {
    const userData: Prisma.UserUpdateInput = {
      ...(data.name === undefined ? {} : { name: data.name }),
      ...(data.email === undefined ? {} : { email: data.email }),
      ...(data.role === undefined ? {} : { role: data.role }),
      ...(data.isActive === undefined ? {} : { isActive: data.isActive }),
      ...(data.passwordHash === undefined
        ? {}
        : { passwordHash: await hash(data.passwordHash, 8) }),
    };

    return await this.usersRepository.updateUser(userId, userData);
  };

  updateOwnProfile = async (
    userId: string,
    data: SelfProfileUpdateData,
  ) => {
    const currentUser =
      await this.usersRepository.findByIdForAuthentication(userId);

    if (!currentUser) {
      throw new AppError("Usuário não encontrado", 404);
    }

    if (data.newPassword !== undefined) {
      const passwordMatches = Boolean(
        currentUser.passwordHash &&
          data.currentPassword &&
          (await compare(data.currentPassword, currentUser.passwordHash)),
      );

      if (!passwordMatches) {
        throw new AppError("Senha atual inválida", 403);
      }
    }

    const userData: Prisma.UserUpdateInput = {
      ...(data.name === undefined ? {} : { name: data.name }),
      ...(data.newPassword === undefined
        ? {}
        : { passwordHash: await hash(data.newPassword, 8) }),
    };

    return await this.usersRepository.updateUser(userId, userData);
  };

  /** Desativa a conta sem excluir tickets ou mensagens históricas. */
  deactivateUser = async (userId: string) =>
    await this.usersRepository.deactivateUser(userId);

  loadUsers = async () => await this.usersRepository.listaAll();

  findByEmail = async (email: string) => {
    return await this.usersRepository.findByEmail(email);
  };
}
