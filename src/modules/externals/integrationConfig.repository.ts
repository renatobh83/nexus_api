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

  // TicketIntegracao
  async createTicketForIntegration(data: Prisma.TicketCreateInput) {
    return prisma.ticket.create({ data });
  }
  async findTicketIntegration(contato: string) {
    return prisma.ticket.findFirst({
      where: {
        contato: contato,
        closedAt: null,
      },
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
// import { Prisma } from "@prisma/client";
// import { prisma } from "../../lib/prisma.js";

// export class IntegrationConfigRepository {
//   private buildMetadataFilter(key: string, value: any) {
//     // Se não houver valor, retorna um objeto vazio (não filtra)
//     if (value === undefined || value === null) return {};

//     // Lista de campos que você sabe que são ARRAYS no seu JSON
//     const camposQueSaoArrays = ["idexterno", "procedimentos"];

//     // Define o operador: 'array_contains' para listas, 'equals' para o resto
//     const operator = camposQueSaoArrays.includes(key)
//       ? "array_contains"
//       : "equals";

//     return {
//       metadata: {
//         path: [key],
//         [operator]: value,
//       },
//     };
//   }
//   async createOrUpdate(dto: Prisma.IntegrationConfigCreateInput) {
//     const config = await prisma.integrationConfig.upsert({
//       where: { integrationName: dto.integrationName },
//       update: dto,
//       create: dto,
//     });
//     return config;
//   }
//   async findIntegracaoConfig(where: Prisma.IntegrationConfigWhereInput) {
//     return await prisma.integrationConfig.findFirst({ where });
//   }

//   // TicketIntegracao
//   async createTicketForIntegration(data: Prisma.TicketCreateInput) {
//     return await prisma.ticket.create({ data: data });
//   }
//   async updateTicketIntegration(data: any) {
//     const { ticketId, currentMetadata, idexterno, procArr, atendimentoHora } =
//       data;

//     return await prisma.ticket.update({
//       where: { id: ticketId },
//       data: {
//         metadata: {
//           ...currentMetadata,
//           idexterno: idexterno,
//           procedimentos: [
//             ...new Set([
//               ...(currentMetadata.procedimentos || []),
//               ...(procArr || []).filter((p: null) => p !== null),
//             ]),
//           ],
//           atendimentoHora:
//             !currentMetadata.atendimentoHora ||
//             currentMetadata.atendimentoHora > atendimentoHora
//               ? atendimentoHora
//               : currentMetadata.atendimentoHora,
//         },
//       },
//     });
//   }

//   async updateTicket(ticketId: number, data: Prisma.TicketUpdateInput) {
//     return await prisma.ticket.update({ where: { id: ticketId }, data });
//   }
//   async findExistsTicketOpen(data: any) {
//     let sql = `
//     SELECT * FROM "Tickets"
//     WHERE contato = $1
//     AND "closedAt" IS NULL
//     AND "isInteraction" = true
//   `;

//     const params: any[] = [data.contato];
//     let paramIndex = 2;

//     // Verificar se algum idexterno existe no array
//     if (data.metadata.idexterno && data.metadata.idexterno.length > 0) {
//       const placeholders = data.metadata.idexterno
//         .map((_: any, i: number) => `$${paramIndex + i}`)
//         .join(", ");

//       sql += ` AND EXISTS (
//       SELECT 1 FROM jsonb_array_elements_text(metadata->'idexterno') AS elem
//       WHERE elem::int IN (${placeholders})
//     )`;

//       params.push(...data.metadata.idexterno);
//       paramIndex += data.metadata.idexterno.length;
//     }

//     // Verificar answered
//     if (data.metadata.answered !== undefined) {
//       sql += ` AND (metadata->>'answered')::boolean = $${paramIndex}`;
//       params.push(data.metadata.answered);
//       paramIndex++;
//     }

//     sql += ` LIMIT 1`;

//     const result = (await prisma.$queryRawUnsafe(sql, ...params)) as any;
//     return result[0];
//   }
// }
