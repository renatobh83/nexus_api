import { Prisma } from "@prisma/client";
import { hash } from "bcryptjs";
import { UsersRepository } from "./users.repository.js";
import { UserCreateData, UserUpdateData } from "./users.security.js";

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

  /** Desativa a conta sem excluir tickets ou mensagens históricas. */
  deactivateUser = async (userId: string) =>
    await this.usersRepository.deactivateUser(userId);

  loadUsers = async () => await this.usersRepository.listaAll();

  findByEmail = async (email: string) => {
    return await this.usersRepository.findByEmail(email);
  };
}
