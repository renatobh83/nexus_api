import { Prisma } from "../../generated/prisma/client";
import { TicketsRepository } from "./tickets.repository";

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
    return await this.ticketRepository.create(data);
  }

  async updateTicket(id: number, data: Prisma.TicketUpdateInput) {
    return await this.ticketRepository.updateTicket(id, data);
  }
}
