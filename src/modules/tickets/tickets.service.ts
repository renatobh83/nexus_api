import { Prisma, Ticket } from "@prisma/client";
import { TicketsRepository } from "./tickets.repository.js";
import {
  getChatWebNamespace,
  getClientIONamespace,
  waitForSocket,
} from "../../lib/socket.js";
import { clearAiHistory } from "../flow/nodes/ProcessAiNode.js";
import { SessaoPacienteService } from "../../integrations/genesis/services/autoatendimento/SessaoPacienteService.js";

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
    const dataForUpdate = data;
    if (dataForUpdate.status === "closed") {
      dataForUpdate.closedAt = new Date().getTime();
      clearAiHistory(id);
      await SessaoPacienteService.encerrar(String(id));
    }

    if (dataForUpdate.status === "pending") {
      dataForUpdate.closedAt = null;
      dataForUpdate.isFlow = false;
      dataForUpdate.isBot = false;
      dataForUpdate.queue = {
        connect: { id: "1" },
      };
    }
    if (dataForUpdate.status === "open") {
      dataForUpdate.closedAt = null;
      dataForUpdate.startedAttendanceAt = new Date().getTime();
      dataForUpdate.isFlow = false;
      dataForUpdate.isBot = false;
      dataForUpdate.queue = {
        connect: { id: "1" },
      };
      clearAiHistory(id);
      await SessaoPacienteService.encerrar(String(id));
    }

    const ticket = await this.ticketRepository.updateTicket(id, dataForUpdate);

    if (ticket.chatClient && dataForUpdate.status === "closed") {
      getChatWebNamespace().emit(
        "chat:closedTicket",
        "Seu ticket foi fechado. Obrigado!",
      );
    }
    if (ticket.userId) {
      const roomName = `user-${ticket.userId}`;
      getClientIONamespace().to(roomName).emit("ticket-updated", ticket);
    } else {
      getClientIONamespace().emit("ticket-updated", ticket);
    }

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
