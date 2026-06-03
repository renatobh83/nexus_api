import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { FlowExecutorService } from "./executor/flow-executor.service.js";

export class FlowsRepository {
  /**
   * Cria um novo Flow no banco de dados.
   * @param data - Os dados já formatados no tipo Prisma.flowsCreateInput.
   */
  async createOrUpdate(data: Prisma.flowsCreateInput) {
    const saved = await prisma.flows.upsert({
      where: { nome: data.nome },
      update: {
        flow_json: data.flow_json,
        descricao: data.descricao,
        updatedAt: new Date(),
      },
      create: {
        nome: data.nome,
        descricao: data.descricao,
        flow_json: data.flow_json,
      },
    });
    return saved;
  }
  /**
   * buscar um flow pelo id
   * @param data - id do flow
   */
  async find(id: string) {
    return await prisma.flows.findUnique({
      where: { id: id },
    });
  }
  /**
   * listar todos os flows ativos
   *
   */
  async listAll() {
    return await prisma.flows.findMany({
      where: { ativo: true },
      select: { id: true, nome: true, descricao: true, updatedAt: true },
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

  async flowExecutionFindFirst(ticketId: string) {
    return await prisma.flowExecution.findFirst({
      where: {
        ticketId: ticketId,
        status: "waiting_response",
      },
    });
  }
}
