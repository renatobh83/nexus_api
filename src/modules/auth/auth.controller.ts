import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { AuthService } from "./auth.service.js";
import jwt from "jsonwebtoken";
const SECRET = process.env.JWT_SECRET as string;
const authService = new AuthService();
export async function authController(fastify: FastifyInstance) {
  fastify.post(
    "/login",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { email, password } = request.body as any;

      const user = await authService.login(email, password);

      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          name: user.name,
          profile: user.role,
        },
        SECRET,
        { expiresIn: "7d" },
      );

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
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { email } = request.body as any;
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
      const decoded = jwt.verify(token, SECRET);
      reply.send({ valid: true, user: decoded }).status(200);
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
