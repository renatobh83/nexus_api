import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { signChatToken } from "../auth/jwt.js";
import { saveFile } from "../../utils/saveFile.js";
import { PUBLIC_DIR } from "../../config/env.js";
import { buildPublicMediaUrl, getMediaBaseUrl } from "../../config/media.js";
import { randomUUID } from "node:crypto";

export async function chatWebController(fastify: FastifyInstance) {
  fastify.get(
    "/chat-widget.js",
    async (request: FastifyRequest, reply: FastifyReply) => {
      return (
        reply
          .type("application/javascript")
          // O widget é servido pelo backend e carregado por uma página externa.
          // O Helmet usa CORP `same-origin` por padrão, o que faria o navegador
          // bloquear este script mesmo com CORS configurado corretamente.
          // A exceção fica restrita a este recurso público, não à API inteira.
          .header("Cross-Origin-Resource-Policy", "cross-origin")
          .header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
          .header("Cache-Control", "no-store")
          .sendFile("chat-widget.js")
      );
    },
  );
  fastify.post(
    "/chatClient/token",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { email, name, identifier } = request.body as any;

      if (
        typeof email !== "string" ||
        !email.trim() ||
        typeof name !== "string" ||
        !name.trim()
      ) {
        return reply.code(400).send({
          error: "Invalid chat identity",
          message: "Nome e email são obrigatórios",
        });
      }

      const token = signChatToken({
        // O subject identifica esta sessão do navegador; não reutilizamos o
        // email como chave de rebind de um ticket existente.
        sub: randomUUID(),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        identifier:
          typeof identifier === "string"
            ? identifier.replace(/\D/g, "")
            : undefined,
        role: "guest",
        type: "chat-client",
      });
      return reply.code(200).send({ token });
    },
  );
  fastify.post(
    "/chatClient/upload",
    { preHandler: fastify.authenticateChat },
    async (request: FastifyRequest, reply: FastifyReply) => {
      let filename: string | undefined;

      try {
        for await (const file of request.files()) {
          if (filename) {
            // O endpoint aceita uma imagem por requisição. Consumir partes
            // adicionais evita deixar o multipart aberto no socket.
            file.file.resume();
            continue;
          }

          filename = await saveFile(file, PUBLIC_DIR);
        }

        if (!filename) {
          return reply.code(400).send({
            error: "Imagem ausente",
            message: "Envie uma imagem no campo multipart `file`.",
          });
        }

        const host = request.headers.host;
        const forwardedProtocol = String(
          request.headers["x-forwarded-proto"] || "http",
        )
          .split(",")[0]
          .trim();
        const fallbackOrigin = host
          ? `${forwardedProtocol}://${host}`
          : undefined;
        const mediaBaseUrl = getMediaBaseUrl(fallbackOrigin);
        const url = buildPublicMediaUrl(filename, mediaBaseUrl);

        return reply.code(201).send({
          url,
          filename,
          mediaUrl: `/public/${encodeURIComponent(filename)}`,
        });
      } catch (error) {
        request.log.error({ error }, "Falha ao salvar imagem do chat web");

        const message = error instanceof Error ? error.message : "";
        const isClientError =
          message.includes("Tipo de imagem") ||
          message.includes("Imagem excede") ||
          message.includes("multipart");

        return reply.code(isClientError ? 400 : 500).send({
          error: "Não foi possível salvar a imagem",
          ...(isClientError ? { message } : {}),
        });
      }
    },
  );
}
