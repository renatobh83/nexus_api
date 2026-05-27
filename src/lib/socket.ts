// src/lib/socket.ts
import { Namespace, Server as SocketIOServer } from "socket.io";
import { Server } from "http";
import { HandleMessageChatWeb } from "../modules/chatWeb/helpers/HandleMessageChatWeb.js";

// src/lib/socket.ts
let io: SocketIOServer | null = null;
let waitForInitPromise: Promise<SocketIOServer> | null = null;

export const initSocket = (server: Server): SocketIOServer => {
  if (io) return io;

  io = new SocketIOServer(server, {
    cors: { origin: "*" },
  });

  // --- NAMESPACE DO CLIENTE ---
  // Aqui entram as conexões padrão do seu cliente
  const clientNamespace = io.of("/client");
  clientNamespace.on("connection", (socket) => {
    console.log("✅ Cliente conectado ao namespace /client:", socket.id);
    const { token } = socket.handshake.auth;
    const payload = JSON.parse(atob(token.split(".")[1]));
    const userId = payload.id; // Supondo que o ID do usuário está no toke
    socket.join(`user-${userId}`);
    console.log(`👤 Usuário ${userId} entrou na sua sala pessoal.`);

    socket.on("join-ticket", (ticketId) => {
      const room = `ticket-${ticketId}`;
      socket.join(room);
      console.log(`🏠 Socket ${socket.id} entrou na sala: ${room}`);
    });
    socket.on("leave-ticket", (ticketId) => {
      socket.leave(`ticket-${ticketId}`);
      socket.leave(`user-${userId}`);
      console.log(`🚪 Socket saiu da sala: ticket-${ticketId}`);
    });
    socket.on("disconnect", () => {
      console.log("❌ Cliente desconectado do namespace /client");
    });
  });
  // --- NAMESPACE DO CHAT WEB ---
  // Aqui só entram conexões que pedirem explicitamente por "/chat-web"
  const chatNamespace = io.of("/chat-web");
  chatNamespace.on("connection", (socket) => {
    const { token } = socket.handshake.auth;
    const payload = JSON.parse(atob(token.split(".")[1]));

    HandleMessageChatWeb(socket, payload);
    console.log("✅ Chat Web conectado ao namespace /chat-web");
  });
  // io.on("connection", (socket) => {
  //   const { token } = socket.handshake.auth;
  //   const payload = JSON.parse(atob(token.split(".")[1]));

  //   const type = "type" in payload ? payload.type.toString() : "";
  //   if (type === "chat-client") {
  //     HandleMessageChatWeb(socket, payload);
  //     return;
  //   }
  //   console.log("cliente conectado:", socket.id);
  //   socket.on("join-ticket", (ticketId) => {
  //     socket.join(`ticket-${ticketId}`);
  //     console.log(`Cliente entrou na sala ticket-${ticketId}`);
  //   });

  //   socket.on("disconnect", () => {
  //     console.log("cliente desconectado:", socket.id);
  //   });
  // });

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

export const getClientIONamespace = (): Namespace => {
  // Mude de SocketIOServer para Namespace
  if (!io) {
    throw new Error("Socket.IO não inicializado");
  }
  return io.of("/client");
};

export const getChatWebNamespace = (): Namespace => {
  if (!io) {
    throw new Error("Socket.IO não inicializado");
  }
  return io.of("/chat-web");
};
