import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

// 1. Tipagem para updateTicketIntegration
interface UpdateTicketIntegrationInput {
  ticketId: number;
  currentMetadata: {
    idexterno?: number[];
    procedimentos?: number[];
    atendimentoHora?: string;
    answered?: boolean;
  };
  idexterno: number[];
  procArr: (number | null)[];
  atendimentoHora: string;
}

// 2. Tipagem para findExistsTicketOpen
interface FindTicketOpenInput {
  contato: string;
  integrationSource: string;
  metadata: {
    idexterno?: number[];
    answered?: boolean;
  };
}

// 3. Constante externa (não recriada a cada chamada)
const ARRAY_METADATA_FIELDS = new Set(["idexterno", "procedimentos"]);

export class IntegrationConfigRepository {
  private buildMetadataFilter(key: string, value: unknown) {
    if (value === undefined || value === null) return {};

    return {
      metadata: {
        path: [key],
        [ARRAY_METADATA_FIELDS.has(key) ? "array_contains" : "equals"]: value,
      },
    };
  }
  async listaAll() {
    return prisma.integrationConfig.findMany();
  }
  async createOrUpdate(dto: Prisma.IntegrationConfigCreateInput) {
    return prisma.integrationConfig.upsert({
      where: { integrationName: dto.integrationName },
      update: dto,
      create: dto,
    });
  }

  async findIntegracaoConfig(where: Prisma.IntegrationConfigWhereInput) {
    return prisma.integrationConfig.findFirst({ where });
  }

  async updateById(id: string, data: Prisma.IntegrationConfigUpdateInput) {
    return prisma.integrationConfig.update({
      where: { id },
      data,
    });
  }

  /** Atualiza exclusivamente o registro identificado pelo UUID administrativo. */

  // TicketIntegracao
  async createTicketForIntegration(data: Prisma.TicketCreateInput) {
    return prisma.ticket.create({ data });
  }
  async findTicketIntegration(contato: string, integrationSource: string) {
    return prisma.ticket.findFirst({
      where: {
        contato,
        closedAt: null,
        isInteraction: true,
        integrationSource,
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async deteleIntegracao(id: string) {
    return prisma.integrationConfig.delete({
      where: {
        id: id,
      },
    });
  }
  async updateTicketIntegration(data: UpdateTicketIntegrationInput) {
    const { ticketId, currentMetadata, idexterno, procArr, atendimentoHora } =
      data;
    data.procArr;

    // 4. Lógica de merge de procedimentos extraída para clareza
    const procedimentosMerged = [
      ...new Set([
        ...(currentMetadata.procedimentos ?? []),
        ...procArr.filter((p): p is number => p !== null),
      ]),
    ];

    // 5. Lógica de horário mais cedo extraída
    const horarioFinal =
      !currentMetadata.atendimentoHora ||
      currentMetadata.atendimentoHora > atendimentoHora
        ? atendimentoHora
        : currentMetadata.atendimentoHora;

    return prisma.ticket.update({
      where: { id: ticketId },
      data: {
        metadata: {
          ...currentMetadata,
          idexterno,
          procedimentos: procedimentosMerged,
          atendimentoHora: horarioFinal,
        },
      },
    });
  }

  async updateTicket(ticketId: number, data: Prisma.TicketUpdateInput) {
    return prisma.ticket.update({ where: { id: ticketId }, data });
  }

  // 6. findExistsTicketOpen reescrito sem SQL raw
  async findExistsTicketOpen(data: FindTicketOpenInput) {
    return prisma.ticket.findFirst({
      where: {
        contato: data.contato,
        closedAt: null,
        isInteraction: true,
        integrationSource: data.integrationSource,
        ...(data.metadata.idexterno?.length
          ? {
              AND: data.metadata.idexterno.map((id) => ({
                metadata: {
                  path: ["idexterno"],
                  array_contains: id,
                },
              })),
            }
          : {}),
        ...(data.metadata.answered !== undefined
          ? {
              metadata: {
                path: ["answered"],
                equals: data.metadata.answered,
              },
            }
          : {}),
      },
    });
  }
}
