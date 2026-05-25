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
    // DIAGNÓSTICO: Verificar quem está na sala
    const roomName = `ticket-${id}`;
    // const connectedSockets = await clientNamespace.in(roomName).fetchSockets();

    // console.log(`📊 Sala: ${roomName}`);
    // console.log(`👥 Sockets conectados nesta sala: ${connectedSockets.length}`);

    clientNamespace.to(roomName).emit("ticket-updated", ticket);
    // const io = await waitForSocket();
    // console.log("UP");
    // io.to(`ticket-${id}`).emit("ticket-updated", ticket);
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
