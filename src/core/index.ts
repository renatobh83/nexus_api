import fastify, {
  FastifyError,
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { Server as SocketIOServer } from "socket.io";
import { prisma } from "../lib/prisma";
import { ChannelManager } from "../modules/channels/ChannelManager";
import { TicketService } from "../modules/tickets/tickets.services";
import routes from "./routes";
import fastifyModule from "./plugins/fastifyModules";

// 🔧 Extensão do tipo para o Fastify reconhecer a propriedade 'io'
declare module "fastify" {
  interface FastifyInstance {
    io: SocketIOServer;
  }
  interface FastifyRequest {
    apiKey?: string;
  }
  interface FastifyInstance {
    verifyApiKey: (
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
  const server = fastify({
    logger: true, // habilita logs bonitos
    // bodyLimit: 10485760, // 10MB
  });

  server.get("/", async () => {
    return { message: "Bem-vindo ao Nexus API!" };
  });

  server.register(async (instance) => {
    try {
      instance.log.info("🔌 Tentando conectar ao banco de dados...");
      await prisma.$connect();
      instance.log.info("✅ Banco de dados conectado com sucesso!");
    } catch (err) {
      instance.log.error(err, "❌ Erro ao conectar no banco");
      throw err; // deixa claro no log
    }
  });
  await server.register(fastifyModule);

  server.setErrorHandler(
    (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
      console.error("ERRO REAL DETECTADO:", error);
      request.log.error(error);

      if (error.code === "FST_CORS_ERROR") {
        return reply.status(400).send({ error: "CORS não permitido" });
      }

      // Resposta padrão para outros erros
      return reply.status(error.statusCode || 500).send({
        error: error.message || "Erro interno no servidor",
      });
    },
  );
  await server.register(routes);

  server.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: "Not Found",
      message: `A rota ${request.url} não existe`,
    });
  });
  const io = new SocketIOServer(server.server, {
    cors: { origin: "*" },
  });
  io.on("connection", (socket) => {
    console.log("cliente conectado:", socket.id);

    socket.on("message", (data) => {
      console.log("mensagem:", data);
    });
  });

  server.decorate("io", io);

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
  return server;
}

/**
 * Funcao responsavel para iniciar o servidor
 *
 *
 */
export async function start() {
  const app = await buildServer();

  fastifyApp = app;
  try {
    await app.listen({ port: 3000, host: "0.0.0.0" });
    app.log.info("Servidor rodando em http://localhost:3000");
    app.server.keepAliveTimeout = 5 * 60 * 1000;

    const channelManager = new ChannelManager();
    // const ticket = new TicketService()
    // const t = await ticket.findTicketId({
    //   contato: "553798385008@c.us",
    //   status: {
    //     notIn: ["closed"]
    //   }
    // })
    // // console.log(t)

    // await channelManager.startSession(1);
    // await channelManager.startAllReadySessions();
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
