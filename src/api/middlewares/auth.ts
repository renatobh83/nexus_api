import crypto from "node:crypto";
import { FastifyReply, FastifyRequest } from "fastify";

export async function verifyApiKey(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const apiKeyHeader = request.headers["x-key"] ?? request.headers["x_api_key"];
  const apiKey = Array.isArray(apiKeyHeader) ? apiKeyHeader[0] : apiKeyHeader;
  const expectedKey = process.env.API_KEY?.trim();

  if (!expectedKey) {
    request.log.error("API_KEY não configurada");
    await reply.code(500).send({
      error: "Configuration error",
      message: "API key não configurada no servidor",
    });
    return;
  }

  const received = typeof apiKey === "string" ? apiKey : "";
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expectedKey);
  const validLength = receivedBuffer.length === expectedBuffer.length;
  const validKey = validLength
    ? crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
    : false;

  if (!validKey) {
    await reply.code(401).send({
      error: "Unauthorized",
      message: "Invalid or missing X-Key header",
    });
  }
}
