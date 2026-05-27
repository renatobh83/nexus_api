import { Prisma, Ticket } from "@prisma/client";
import { TicketsRepository } from "./tickets.repository.js";
import { getClientIONamespace, waitForSocket } from "../../lib/socket.js";

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
  async listTickets() {
    const tickets = await this.ticketRepository.findAll();
    return tickets;
  }

  async createTicket(data: Prisma.TicketCreateInput) {
    const ticket = (await this.ticketRepository.create(data)) as Ticket;

    return ticket;
  }

  async updateTicket(id: number, data: Prisma.TicketUpdateInput) {
    const ticket = await this.ticketRepository.updateTicket(id, data);

    const clientNamespace = getClientIONamespace();
    if (ticket.userId) {
      const roomName = `user-${ticket.userId}`;
      clientNamespace.to(roomName).emit("ticket-updated", ticket);
    } else {
      clientNamespace.emit("ticket-updated", ticket);
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
