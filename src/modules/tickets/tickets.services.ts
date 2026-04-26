import { Prisma } from "../../generated/prisma/client";
import { TicketsRepository } from "./tickets.repository";

export class TicketService {
  private ticketRepository: TicketsRepository;

  constructor() {
    this.ticketRepository = new TicketsRepository();
  }

  async findTicketId(where: Prisma.TicketWhereInput) {
    return await this.ticketRepository.findByField(where);
  }

  async listTickets() {
    const tickets = await this.ticketRepository.findAll()
    return tickets
  }
}