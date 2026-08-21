import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { AuthService } from "./auth.service.js";
import { signUserToken, verifyUserToken } from "./jwt.js";
const authService = new AuthService();
export async function authController(fastify: FastifyInstance) {
  fastify.post(
    "/login",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { email, password } = request.body as any;

      const user = await authService.login(email, password);

      const token = signUserToken({
        sub: String(user.id),
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        profile: user.role,
        type: "user",
      });

      reply.status(200).send({
        success: true,
        token: token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      });
    },
  );
  fastify.post(
    "/logout",
    { preHandler: fastify.authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const email = request.user?.email;

      if (!email) {
        return reply.code(401).send({ message: "Invalid authenticated user" });
      }

      const user = await authService.logout(email);
      reply.status(200).send({
        sucess: true,
        name: user.name,
        lastLogout: user.lastLogout,
      });
    },
  );
  fastify.post(
    "/validate-token",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { token } = request.body as any;
      if (!token) {
        return reply.send({ valid: false });
      }
      try {
        const decoded = verifyUserToken(token);
        return reply.status(200).send({ valid: true, user: decoded });
      } catch {
        return reply.status(200).send({ valid: false });
      }
    },
  );
  // fastify.get(
  //   "/:email",
  //   async (request: FastifyRequest, reply: FastifyReply) => {
  //     try {
  //       const { email } = request.params as any;
  //       const user = await usersService.findByEmail(email);
  //       reply.status(200).send(user);
  //     } catch (error) {
  //       reply
  //         .status(500)
  //         .send({ message: `Erro interno ${JSON.stringify(error, null, 2)}` });
  //     }
  //   },
  // );
  // fastify.put(
  //   "/:userId",
  //   async (request: FastifyRequest, reply: FastifyReply) => {
  //     try {
  //       const { userId } = request.params as any;
  //       const userData = request.body as any;
  //       const user = await usersService.updateUser(userId, userData);
  //       reply.status(200).send(user);
  //     } catch (error) {
  //       reply
  //         .status(500)
  //         .send({ message: `Erro interno ${JSON.stringify(error, null, 2)}` });
  //     }
  //   },
  // );
}
