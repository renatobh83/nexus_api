import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import {
  PUBLIC_COMPANY_SELECT,
  type PublicCompanyRecord,
} from "./companySelections.js";

export class CompaniesRepository {
  async listAll(): Promise<PublicCompanyRecord[]> {
    return prisma.company.findMany({
      select: PUBLIC_COMPANY_SELECT,
      orderBy: [{ isActive: "desc" }, { legalName: "asc" }],
    });
  }

  async findById(id: string): Promise<PublicCompanyRecord | null> {
    return prisma.company.findUnique({
      where: { id },
      select: PUBLIC_COMPANY_SELECT,
    });
  }

  async findByCnpj(cnpj: string): Promise<PublicCompanyRecord | null> {
    return prisma.company.findUnique({
      where: { cnpj },
      select: PUBLIC_COMPANY_SELECT,
    });
  }

  async create(
    data: Prisma.CompanyCreateInput,
  ): Promise<PublicCompanyRecord> {
    return prisma.company.create({
      data,
      select: PUBLIC_COMPANY_SELECT,
    });
  }

  async update(
    id: string,
    data: Prisma.CompanyUpdateInput,
  ): Promise<PublicCompanyRecord | null> {
    const existing = await prisma.company.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) return null;

    return prisma.company.update({
      where: { id },
      data,
      select: PUBLIC_COMPANY_SELECT,
    });
  }

  async deactivate(id: string) {
    return prisma.company.updateMany({
      where: { id, isActive: true },
      data: { isActive: false },
    });
  }
}

/*
 * Todas as operações administrativas retornam a projeção pública; nenhuma
 * consulta depende do retorno completo do modelo para evitar exposição futura.
 */
