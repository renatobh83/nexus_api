import { FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "./AppError.js";

export async function errorHandler(
  error: Error,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  console.error(error);

  // Erro personalizado
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      success: false,
      error: error.message,
      statusCode: error.statusCode,
    });
  }

  // Erro padrão
  return reply.status(500).send({
    success: false,
    error: "Erro interno do servidor",
    statusCode: 500,
  });
}
