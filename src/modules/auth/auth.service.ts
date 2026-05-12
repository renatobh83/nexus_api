import { compare, compareSync } from "bcryptjs";
import { UsersRepository } from "../users/users.repository.js";
import { AppError } from "../../utils/AppError.js";

export class AuthService {
  private usersRepository: UsersRepository;
  constructor() {
    this.usersRepository = new UsersRepository();
  }

  async login(email: string, password: string) {
    const user = await this.usersRepository.findByEmail(email);

    if (!user) {
      throw new AppError("ERR_USER_NOT_FOUND");
    }

    const isPasswordValid = await compare(password, user.passwordHash!);

    if (!isPasswordValid) {
      throw new AppError("ERR_INVALID_CREDENTIALS", 403);
    }
    if (!user.isActive) {
      throw new AppError("Usuário não esta ativo.");
    }
    const updateLogin = await this.usersRepository.updateUser(user.id, {
      isOnline: true,
      lastLogin: new Date(),
    });
    return updateLogin;
  }
  async logout(email: string) {
    const user = await this.usersRepository.findByEmail(email);

    if (!user) {
      throw new Error("ERR_USER_NOT_FOUND");
    }

    const updateLogin = await this.usersRepository.updateUser(user.id, {
      isOnline: false,
      lastLogout: new Date(),
    });
    return updateLogin;
  }
}
