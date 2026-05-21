import { FastifyRequest, FastifyReply } from "fastify";
import { FastifyInstance } from "fastify/types/instance.js";
import jwt from "jsonwebtoken";
export async function chatWebController(fastify: FastifyInstance) {
  fastify.get(
    "/chat-widget.js",
    async (request: FastifyRequest, reply: FastifyReply) => {
      return reply
        .type("application/javascript")
        .header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        .sendFile("chat-widget.js");
    },
  );
  fastify.post(
    "/chatClient/token",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { email, name } = request.body as any;
      const JWT_SECRET = process.env.CHAT_SECRET!;
      const payload = {
        name,
        email,
        role: "guest",
        type: "chat-client",
      };
      const token = jwt.sign(payload, JWT_SECRET, {
        expiresIn: "360m",
      });
      return reply.code(200).send({ token });
    },
  );
}
