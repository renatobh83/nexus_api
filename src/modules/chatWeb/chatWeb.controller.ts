import { FastifyRequest, FastifyReply } from "fastify";
import { FastifyInstance } from "fastify/types/instance.js";
import jwt from "jsonwebtoken";
import { saveFile } from "../../utils/saveFile.js";
import path from "node:path";
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
  fastify.post(
    "/chatClient/upload",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const files = request.files();
      const publicFolder = path.join(process.cwd(), "public");
      let filename: string = "";
      for await (const file of files) {
        try {
          filename = await saveFile(file, publicFolder);
        } catch (error) {
          console.log(error);
        }
      }
      const fileUrl = `${process.env.MEDIA_URL}/public/${filename}`;

      return reply.code(200).send({ url: fileUrl });
    },
  );
}
