import fastify, { FastifyInstance } from "fastify";
import { Server as SocketIOServer } from 'socket.io'
import { ChannelManager } from "../../lib/channels/ChannelManager";
import { prisma } from "../../lib/prisma";

// 🔧 Extensão do tipo para o Fastify reconhecer a propriedade 'io'
declare module 'fastify' {
  interface FastifyInstance {
    io: SocketIOServer
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
    logger: true // habilita logs bonitos
  })

  const io = new SocketIOServer(server.server, {
    cors: { origin: '*' }
  })

  io.on('connection', (socket) => {
    console.log('cliente conectado:', socket.id)

    socket.on('message', (data) => {
      console.log('mensagem:', data)
    })
  })

  server.decorate('io', io)
  await prisma.$connect();
  console.log('✅ Conexão com o banco de dados estabelecida com sucesso!');
    
  prisma.$on('info', async () => {
  console.log('🔌 Cliente Prisma está prestes a desconectar');
});
    return server
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
    // await channelManager.startAllReadySessions()
    await channelManager.startSession(2)

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