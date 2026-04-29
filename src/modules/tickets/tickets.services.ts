import { Prisma, Ticket } from "@prisma/client";
import { TicketsRepository } from "./tickets.repository.js";
import { waitForSocket } from "../../lib/socket.js";

export class TicketService {
  private ticketRepository: TicketsRepository;

  constructor() {
    this.ticketRepository = new TicketsRepository();
  }

  async findTicket(where: Prisma.TicketWhereInput) {
    return await this.ticketRepository.findByField(where);
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
    const io = await waitForSocket();
    io.emit("ticket-updated", ticket);
    return ticket;
  }
}
