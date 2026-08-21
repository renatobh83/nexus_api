import { Prisma, Ticket } from "@prisma/client";
import { TicketsRepository } from "./tickets.repository.js";
import {
  getChatWebNamespace,
  getClientIONamespace,
  waitForSocket,
} from "../../lib/socket.js";
import { clearAiHistory } from "../flow/nodes/ProcessAiNode.js";
import { SessaoPacienteService } from "../../integrations/genesis/services/autoatendimento/SessaoPacienteService.js";

const HUMAN_QUEUE_ID_ENV = "HUMAN_QUEUE_ID";

/**
 * Aplica a fila humana somente quando ela foi explicitamente configurada.
 * Sem configuração, a transição preserva a fila atual em vez de usar um ID
 * fixo que pode não existir no banco de dados.
 */
function connectConfiguredHumanQueue(data: Prisma.TicketUpdateInput): void {
  const queueId = process.env[HUMAN_QUEUE_ID_ENV]?.trim();
  if (!queueId) return;

  data.queue = {
    connect: { id: queueId },
  };
}

/**
 * Registra falhas de efeitos posteriores sem transformar uma atualização já
 * persistida em erro de requisição.
 */
function logPostCommitFailure(
  effect: string,
  ticketId: number,
  error: unknown,
): void {
  console.error(`[TicketService] Falha no efeito pós-commit: ${effect}`, {
    ticketId,
    error,
  });
}

/**
 * Executa limpeza de sessão e notificações somente depois que o ticket foi
 * atualizado. Cada efeito é isolado para que uma indisponibilidade do Redis
 * ou do Socket.IO não desfaça nem mascare a alteração persistida. O chamador
 * pode dispará-lo sem bloquear a resposta HTTP.
 */
async function runPostCommitEffects(
  ticket: Ticket,
  requestedStatus: string | undefined,
): Promise<void> {
  if (requestedStatus === "closed" || requestedStatus === "open") {
    clearAiHistory(ticket.id);

    try {
      await SessaoPacienteService.encerrar(String(ticket.id));
    } catch (error) {
      logPostCommitFailure("encerrar sessão do paciente", ticket.id, error);
    }
  }

  if (requestedStatus === "closed" && ticket.chatClient) {
    if (!ticket.socketId) {
      console.warn(
        `[TicketService] Ticket de chat web ${ticket.id} fechado sem socketId ativo`,
      );
    } else {
      try {
        getChatWebNamespace()
          .to(ticket.socketId)
          .emit("chat:closedTicket", "Seu ticket foi fechado. Obrigado!");
      } catch (error) {
        logPostCommitFailure(
          "notificar fechamento no chat web",
          ticket.id,
          error,
        );
      }
    }
  }

  try {
    const clientNamespace = getClientIONamespace();
    if (ticket.userId) {
      clientNamespace
        .to(`user-${ticket.userId}`)
        .emit("ticket-updated", ticket);
    } else {
      clientNamespace.emit("ticket-updated", ticket);
    }
  } catch (error) {
    logPostCommitFailure("notificar atualização no painel", ticket.id, error);
  }
}

export class TicketService {
  private ticketRepository: TicketsRepository;

  constructor() {
    this.ticketRepository = new TicketsRepository();
  }

  async findTicket(where: Prisma.TicketWhereInput) {
    return await this.ticketRepository.findByField(where);
  }

  async findTickeWhitoutMessage(where: Prisma.TicketWhereInput) {
    return await this.ticketRepository.findTicket(where);
  }
  async listTickets(where?: Prisma.TicketWhereInput) {
    const tickets = await this.ticketRepository.findAll(where);
    return tickets;
  }

  async createTicket(data: Prisma.TicketCreateInput) {
    const ticket = (await this.ticketRepository.create(data)) as Ticket;

    return ticket;
  }
  async updateTicket(id: number, data: Prisma.TicketUpdateInput) {
    const requestedStatus =
      typeof data.status === "string" ? data.status : undefined;
    const dataForUpdate: Prisma.TicketUpdateInput = { ...data };

    if (requestedStatus === "closed") {
      dataForUpdate.closedAt = new Date().getTime();
    }

    if (requestedStatus === "pending") {
      dataForUpdate.closedAt = null;
      dataForUpdate.isFlow = false;
      dataForUpdate.isBot = false;
      connectConfiguredHumanQueue(dataForUpdate);
    }

    if (requestedStatus === "open") {
      dataForUpdate.closedAt = null;
      dataForUpdate.startedAttendanceAt = new Date().getTime();
      dataForUpdate.isFlow = false;
      dataForUpdate.isBot = false;
      connectConfiguredHumanQueue(dataForUpdate);
    }

    // Uma atualização Prisma única já é atômica para os campos do ticket.
    // Efeitos Redis, memória e Socket.IO são executados somente após o commit.
    const ticket = await this.ticketRepository.updateTicket(id, dataForUpdate);
    void runPostCommitEffects(ticket, requestedStatus).catch((error) => {
      logPostCommitFailure("efeitos de transição", ticket.id, error);
    });

    return ticket;
  }
  async createMessageAndUpdateTicket(
    ticketId: number,
    updateTicket: Prisma.TicketUpdateInput,
    messageData: Prisma.MessageCreateInput,
  ) {
    return await this.ticketRepository.createcreateMessageAndUpdateTicket(
      ticketId,
      updateTicket,
      messageData,
    );
  }
}
