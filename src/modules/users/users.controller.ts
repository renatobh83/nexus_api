import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { UsersService } from "./users.service.js";
const usersService = new UsersService();

export async function usersController(fastify: FastifyInstance) {
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const users = await usersService.loadUsers();
    reply.status(200).send(users);
  });
  fastify.post("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id, status, ...userData } = request.body as any;

    const user = await usersService.createUser(userData);
    reply.status(200).send(user);
  });
  fastify.get(
    "/:email",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { email } = request.params as any;
      const user = await usersService.findByEmail(email);
      reply.status(200).send(user);
    },
  );
  fastify.put(
    "/:userId",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request.params as any;
      const userData = request.body as any;
      userData.isActive === "false"
        ? (userData.isActive = false)
        : (userData.isActive = true);

      const user = await usersService.updateUser(userId, userData);
      reply.status(200).send(user);
    },
  );
}
