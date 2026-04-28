// src/lib/socket.ts
import { Server as SocketIOServer } from "socket.io";
import { Server } from "http";
// src/lib/socket.ts
let io: SocketIOServer | null = null;
let waitForInitPromise: Promise<SocketIOServer> | null = null;

export const initSocket = (server: Server): SocketIOServer => {
  if (io) return io;

  io = new SocketIOServer(server, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    console.log("cliente conectado:", socket.id);

    socket.on("join-ticket", (ticketId) => {
      socket.join(`ticket-${ticketId}`);
      console.log(`Cliente entrou na sala ticket-${ticketId}`);
    });

    socket.on("disconnect", () => {
      console.log("cliente desconectado:", socket.id);
    });
  });

  return io;
};

export const waitForSocket = (): Promise<SocketIOServer> => {
  if (io) {
    return Promise.resolve(io);
  }

  if (!waitForInitPromise) {
    waitForInitPromise = new Promise((resolve) => {
      // Aguarda até 5 segundos pelo socket
      let attempts = 0;
      const interval = setInterval(() => {
        if (io) {
          clearInterval(interval);
          resolve(io);
        }
        attempts++;
        if (attempts > 50) {
          // 5 segundos
          clearInterval(interval);
          console.warn("⚠️ Timeout aguardando Socket.IO");
          resolve(null as any);
        }
      }, 100);
    });
  }

  return waitForInitPromise;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error("Socket.IO não inicializado");
  }
  return io;
};
