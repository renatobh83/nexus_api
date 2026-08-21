import { Namespace, Server as SocketIOServer, ServerOptions } from "socket.io";
import { Server } from "node:http";
import { HandleMessageChatWeb } from "../modules/chatWeb/helpers/HandleMessageChatWeb.js";
import {
  AuthClaims,
  extractBearerToken,
  getClaimRole,
  getClaimSubject,
  verifyChatToken,
  verifyUserToken,
} from "../modules/auth/jwt.js";
import { TicketsRepository } from "../modules/tickets/tickets.repository.js";
import { getAllowedCorsOrigins } from "../config/cors.js";

let io: SocketIOServer | null = null;
let waitForInitPromise: Promise<SocketIOServer> | null = null;

const ticketsRepository = new TicketsRepository();
const staffRoles = new Set(["administrador", "atendente"]);

function getSocketToken(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const bearerToken = extractBearerToken(value);
  if (bearerToken) return bearerToken;

  const rawToken = value.trim();
  return rawToken || undefined;
}

function authenticateNamespace(
  namespace: ReturnType<SocketIOServer["of"]>,
  verifier: (token: string) => AuthClaims,
  validateClaims: (claims: AuthClaims) => boolean,
): void {
  namespace.use((socket, next) => {
    const token = getSocketToken(socket.handshake.auth?.token);

    if (!token) {
      return next(new Error("invalid token"));
    }

    try {
      const claims = verifier(token);

      if (!validateClaims(claims)) {
        return next(new Error("invalid token"));
      }

      socket.data.auth = claims;
      return next();
    } catch {
      return next(new Error("invalid token"));
    }
  });
}

async function canJoinTicket(
  claims: AuthClaims,
  ticketId: number,
): Promise<boolean> {
  const role = getClaimRole(claims);

  if (role && staffRoles.has(role.toLowerCase())) {
    return true;
  }

  const subject = getClaimSubject(claims);
  if (!subject) return false;

  const ticket = await ticketsRepository.findTicket({ id: ticketId });
  return Boolean(ticket?.userId && String(ticket.userId) === subject);
}

export const initSocket = (server: Server): SocketIOServer => {
  if (io) return io;

  const socketOptions: Partial<ServerOptions> = {
    cors: {
      origin: getAllowedCorsOrigins(),
      credentials: true,
    },
  };

  io = new SocketIOServer(server, socketOptions);

  const clientNamespace = io.of("/client");
  authenticateNamespace(clientNamespace, verifyUserToken, (claims) =>
    Boolean(getClaimSubject(claims)),
  );

  clientNamespace.on("connection", (socket) => {
    const claims = socket.data.auth as AuthClaims;
    const userId = getClaimSubject(claims);

    if (!userId) {
      socket.disconnect(true);
      return;
    }

    socket.join(`user-${userId}`);

    socket.on("join-ticket", async (ticketId: unknown) => {
      const parsedTicketId = Number(ticketId);

      if (!Number.isInteger(parsedTicketId) || parsedTicketId <= 0) {
        socket.emit("ticket-join-error", "Ticket inválido");
        return;
      }

      try {
        const allowed = await canJoinTicket(claims, parsedTicketId);
        if (!allowed) {
          socket.emit("ticket-join-error", "Acesso não autorizado");
          return;
        }

        await socket.join(`ticket-${parsedTicketId}`);
      } catch (error) {
        socket.emit("ticket-join-error", "Não foi possível acessar o ticket");
        socket.emit("socket-error", "Erro interno de autorização");
        console.error("Erro ao autorizar sala de ticket", error);
      }
    });

    socket.on("leave-ticket", (ticketId: unknown) => {
      const parsedTicketId = Number(ticketId);
      if (Number.isInteger(parsedTicketId) && parsedTicketId > 0) {
        void socket.leave(`ticket-${parsedTicketId}`);
      }
    });
  });

  const chatNamespace = io.of("/chat-web");
  authenticateNamespace(
    chatNamespace,
    verifyChatToken,
    (claims) =>
      claims.type === "chat-client" &&
      claims.role === "guest" &&
      typeof claims.email === "string" &&
      typeof claims.name === "string" &&
      typeof claims.sub === "string" &&
      claims.sub.length > 0,
  );

  chatNamespace.on("connection", (socket) => {
    const claims = socket.data.auth as AuthClaims;
    void HandleMessageChatWeb(socket, {
      name: claims.name as string,
      email: claims.email as string,
      sessionId: claims.sub as string,
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
      let attempts = 0;
      const interval = setInterval(() => {
        if (io) {
          clearInterval(interval);
          resolve(io);
          return;
        }

        attempts++;
        if (attempts > 50) {
          clearInterval(interval);
          console.warn("Socket.IO não inicializado dentro do prazo");
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
