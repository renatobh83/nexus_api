import fastify, {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { Server as SocketIOServer } from "socket.io";
import { prisma } from "../lib/prisma.js";
import {
  AuthClaims,
  extractBearerToken,
  verifyChatToken,
  verifyUserToken,
} from "../modules/auth/jwt.js";
import { ChannelManager } from "../modules/channels/ChannelManager.js";

import routes from "./routes/index.js";
import fastifyModule from "./plugins/fastifyModules.js";
import { initSocket } from "../lib/socket.js";
import { errorHandler } from "../utils/errorHandler.js";
import { AppError } from "../utils/AppError.js";
import { loadAppConfig } from "../config/appConfig.js";
import { isTokenRevoked } from "../modules/auth/tokenRevocation.js";

let io: SocketIOServer | null = null;

// 🔧 Extensão do tipo para o Fastify reconhecer a propriedade 'io'
declare module "fastify" {
  interface FastifyInstance {
    io: SocketIOServer | null; // ✅ aceita null
  }
  interface FastifyRequest {
    user?: AuthClaims;
    chatUser?: AuthClaims;
    isInternalFlow?: boolean;
  }
  interface FastifyInstance {
    authenticateChat: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
    authorizeRoles: (...roles: string[]) => (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
  }
}
let fastifyApp: FastifyInstance;

/**
 * Funcao responsavel para construir o servidor
 *
 * @returns {Promise<FastifyInstance>} Uma Promise que resolve para o objeto do FastifyInstance
 */
async function buildServer(): Promise<FastifyInstance> {
  // Falha antes de plugins e rotas quando um segredo ou conexão obrigatória
  // está ausente ou malformado.
  const appConfig = loadAppConfig();
  const server = fastify({
    logger: true, // habilita logs bonitos
    // bodyLimit: 10485760, // 10MB
  });
  server.setErrorHandler(errorHandler);
  server.get("/", async () => {
    return { message: "Bem-vindo ao Nexus API!" };
  });

  await server.register(async (instance) => {
    try {
      instance.log.info("🔌 Tentando conectar ao banco de dados...");
      await prisma.$connect();
      instance.log.info("✅ Banco de dados conectado com sucesso!");
    } catch (err) {
      instance.log.error(err, "❌ Erro ao conectar no banco");
      throw err; // deixa claro no log
    }
  });

  await server.register(fastifyModule, { appConfig });

  server.decorate(
    "authorizeRoles",
    (...allowedRoles: string[]) =>
      async function (request: FastifyRequest, reply: FastifyReply) {
        const role = request.user?.role ?? request.user?.profile;
        const normalizedRole = role?.toLowerCase();
        const normalizedAllowedRoles = allowedRoles.map((item) =>
          item.toLowerCase(),
        );

        if (!normalizedRole || !normalizedAllowedRoles.includes(normalizedRole)) {
          throw new AppError("Insufficient permissions", 403);
        }
      },
  );

  server.decorate(
    "authenticateChat",
    async function (request: FastifyRequest, reply: FastifyReply) {
      const token = extractBearerToken(request.headers.authorization);

      if (!token) {
        throw new AppError("Not authenticated", 401);
      }

      try {
        request.chatUser = verifyChatToken(token);
      } catch (error) {
        request.log.warn({ error }, "Token de chat inválido");
        throw new AppError("Invalid token", 401);
      }
    },
  );

  server.decorate(
    "authenticate",
    async function (request: FastifyRequest, reply: FastifyReply) {
      const token = extractBearerToken(request.headers.authorization);

      if (!token) {
        throw new AppError("Not authenticated", 401);
      }

      try {
        const claims = verifyUserToken(token);
        if (await isTokenRevoked(claims)) {
          throw new AppError("Invalid token", 401);
        }

        if (
          claims.service === "flow-executor" &&
          claims.role === "internal"
        ) {
          request.isInternalFlow = true;
        }

        request.user = claims;
      } catch (error) {
        request.log.warn({ error }, "Token Bearer inválido");
        throw new AppError("Invalid token", 401);
      }
    },
  );
  await server.register(routes);

  server.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      success: false,
      error: `A rota ${request.url} não existe`,
      statusCode: 404,
    });
  });

  const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
  signals.forEach((signal) => {
    process.on(signal, async () => {
      try {
        await server.close();
        // await shutdown();
        server.log.error(`Closed application on ${signal}`);
        process.exit(0);
      } catch (err: any) {
        server.log.error(`Error closing application on ${signal}`, err);
        process.exit(1);
      }
    });
  });
  server.decorate<SocketIOServer | null>("io", null);

  server.addHook("onReady", async () => {
    if (!server.io) {
      server.io = initSocket(server.server);
    }
  });
  return server;
}

/**
 * Funcao responsavel para iniciar o servidor
 *
 *
 */
export async function start() {
  const app = await buildServer();

  //   const flowServiceToken = jwt.sign(
  //     { service: "flow-executor", role: "internal" },

  //     { expiresIn: "1y" }, // ajuste conforme sua política
  //   );

  //   console.log(flowServiceToken);
  fastifyApp = app;
  try {
    app.server.keepAliveTimeout = 5 * 60 * 1000;
    await app.listen({ port: 3000, host: "0.0.0.0" });

    setImmediate(async () => {
      const channelManager = new ChannelManager();
      channelManager.startAllReadySessions().catch(app.log.error);
    });
  } catch (err: any) {
    if (app) {
      app.log.error(err, "❌ Falha ao iniciar o servidor.");
    } else {
      console.error("❌ Falha crítica antes da inicialização do logger:", err);
    }

    process.exit(1);
  }
}
export const getFastifyApp = () => fastifyApp;
