import { FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "./AppError.js";

interface FastifyErrorLike extends Error {
  statusCode?: number;
  code?: string;
  validation?: unknown;
}

/**
 * Converte qualquer exceção lançada durante uma requisição em uma resposta
 * JSON estável, mantendo mensagens operacionais e ocultando detalhes internos.
 */
export async function errorHandler(
  error: FastifyErrorLike,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const statusCode = resolveStatusCode(error);
  const isClientError = statusCode >= 400 && statusCode < 500;
  const message = isClientError
    ? error.message || "Requisição inválida"
    : "Erro interno do servidor";

  request.log.error(
    {
      err: error,
      statusCode,
      requestId: request.id,
      method: request.method,
      url: request.url,
    },
    "Erro não tratado durante a requisição",
  );

  return reply.status(statusCode).send({
    success: false,
    error: message,
    statusCode,
  });
}

/**
 * Prioriza o status explícito de `AppError` e dos erros do Fastify, mas impede
 * que valores inválidos façam a API responder com um status fora do intervalo.
 */
function resolveStatusCode(error: FastifyErrorLike): number {
  const statusCode =
    error instanceof AppError ? error.statusCode : (error.statusCode ?? 500);

  return Number.isInteger(statusCode) && statusCode >= 400 && statusCode <= 599
    ? statusCode
    : 500;
}
