import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../../utils/AppError.js";
import { getAuthenticatedSubject } from "../auth/authorization.js";
import {
  canDeactivateUser,
  parseUserEmail,
  parseUserId,
  parseUserWriteData,
  toPublicUser,
} from "./users.security.js";
import { UsersService } from "./users.service.js";

const usersService = new UsersService();

interface UserParams {
  userId?: unknown;
  email?: unknown;
}

/**
 * Registra os endpoints administrativos de usuários com validação explícita
 * dos identificadores e dos campos que podem ser persistidos.
 */
export async function usersController(fastify: FastifyInstance) {
  fastify.get("/", async (_request: FastifyRequest, reply: FastifyReply) => {
    const users = await usersService.loadUsers();
    reply.status(200).send(users.map(toPublicUser));
  });

  fastify.post("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const userData = parseUserWriteData(request.body, "create");

    if (!userData) {
      throw new AppError("Dados de usuário inválidos", 400);
    }

    const user = await usersService.createUser(userData);
    reply.status(200).send(toPublicUser(user));
  });

  fastify.get(
    "/:email",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const email = parseUserEmail((request.params as UserParams).email);

      if (!email) {
        throw new AppError("Email de usuário inválido", 400);
      }

      const user = await usersService.findByEmail(email);
      reply.status(200).send(user ? toPublicUser(user) : null);
    },
  );

  fastify.put(
    "/:userId",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = parseUserId((request.params as UserParams).userId);
      const userData = parseUserWriteData(request.body, "update");

      if (!userId) {
        throw new AppError("ID de usuário inválido", 400);
      }

      if (!userData) {
        throw new AppError("Dados de usuário inválidos", 400);
      }

      const user = await usersService.updateUser(userId, userData);
      reply.status(200).send(toPublicUser(user));
    },
  );

  fastify.delete(
    "/:userId",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = parseUserId((request.params as UserParams).userId);
      const actorSubject = getAuthenticatedSubject(request.user);

      if (!userId) {
        throw new AppError("ID de usuário inválido", 400);
      }

      if (!canDeactivateUser(actorSubject, userId)) {
        throw new AppError("Não é permitido desativar o próprio usuário", 409);
      }

      const result = await usersService.deactivateUser(userId);
      if (result.count === 0) {
        throw new AppError("Usuário não encontrado", 404);
      }

      return reply.status(204).send();
    },
  );
}
