import { Prisma } from "@prisma/client";
import { hash } from "bcryptjs";
import { UsersRepository } from "./users.repository.js";

export class UsersService {
  private usersRepository: UsersRepository;
  constructor() {
    this.usersRepository = new UsersRepository();
  }
  createUser = async (data: Prisma.UserCreateInput) => {
    try {
      const userData = { ...data };
      if (data.passwordHash) {
        userData.passwordHash = await hash(data.passwordHash, 8);
      }
      return await this.usersRepository.create(userData);
    } catch (error) {
      throw error;
    }
  };

  updateUser = async (userId: string, data: Prisma.UserUpdateInput) => {
    const userData = { ...data };

    if (typeof data.passwordHash === "string") {
      userData.passwordHash = await hash(data.passwordHash, 8);
    }

    return await this.usersRepository.updateUser(userId, userData);
  };
  loadUsers = async () => await this.usersRepository.listaAll();
  findByEmail = async (email: string) => {
    return await this.usersRepository.findByEmail(email);
  };
}
