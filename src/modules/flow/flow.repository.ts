import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { FlowExecutorService } from "./executor/flow-executor.service.js";

export class FlowsRepository {
  /**
   * Cria um novo Flow no banco de dados.
   * @param data - Os dados já formatados no tipo Prisma.flowsCreateInput.
   */
  async createOrUpdate(data: Prisma.flowsCreateInput) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.flows.findUnique({
        where: { nome: data.nome },
        select: { id: true },
      });

      if (existing) {
        return tx.flows.update({
          where: { id: existing.id },
          data: {
            flow_json: data.flow_json,
            descricao: data.descricao,
            updatedAt: new Date(),
          },
        });
      }

      const activeFlow = await tx.flows.findFirst({
        where: { ativo: true },
        select: { id: true },
      });

      return tx.flows.create({
        data: {
          nome: data.nome,
          descricao: data.descricao,
          flow_json: data.flow_json,
          ativo: !activeFlow,
        },
      });
    });
  }
  /**
   * buscar um flow pelo id
   * @param data - id do flow
   */
  async find(id: string) {
    return await prisma.flows.findUnique({
      where: { id },
    });
  }
  async findMainActive() {
    return await prisma.flows.findFirst({
      where: { ativo: true },
      orderBy: [
        { updatedAt: "desc" },
        { createdAt: "desc" },
        { id: "asc" },
      ],
    });
  }
  /**
   * listar todos os flows ativos
   *
   */
  async listAll() {
    return await prisma.flows.findMany({
      orderBy: [{ ativo: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        nome: true,
        descricao: true,
        ativo: true,
        updatedAt: true,
      },
    });
  }

  async activate(id: string) {
    return prisma.$transaction(async (tx) => {
      const flow = await tx.flows.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!flow) return null;

      await tx.flows.updateMany({
        where: {
          ativo: true,
          id: { not: id },
        },
        data: {
          ativo: false,
        },
      });

      return tx.flows.update({
        where: { id },
        data: {
          ativo: true,
          updatedAt: new Date(),
        },
      });
    });
  }
  /**
   * soft delete (só marca ativo: false)
   *@param data - id do flow
   */
  async delete(data: string) {
    return await prisma.flows.update({
      where: { id: data },
      data: { ativo: false },
    });
  }

  async flowExecutionFindFirst(where: Prisma.FlowExecutionWhereInput) {
    return await prisma.flowExecution.findFirst({
      where,
    });
  }
  async createflowExecution(data: Prisma.FlowExecutionCreateInput) {
    return prisma.flowExecution.create({ data: data });
  }
  async updateFlowExecution(id: string, data: Prisma.FlowExecutionUpdateInput) {
    return prisma.flowExecution.update({
      where: { id: id },
      data: data,
    });
  }

  // Ai Prompts
  async listAIPromptRepo() {
    return prisma.aiPrompt.findMany();
  }
  async findAIPromptRepo(promptName: string) {
    return prisma.aiPrompt.findFirst({ where: { name: promptName } });
  }

  async createAiPrompt(data: Prisma.AiPromptCreateInput) {
    return prisma.aiPrompt.create({
      data,
    });
  }

  async updateAiPrompt(id: string, data: Prisma.AiPromptUpdateInput) {
    return prisma.aiPrompt.update({
      where: { id },
      data,
    });
  }
  async delteAiPrompt(id: string) {
    return prisma.aiPrompt.delete({
      where: { id },
    });
  }
}
