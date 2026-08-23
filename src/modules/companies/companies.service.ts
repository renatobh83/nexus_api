import { CompaniesRepository } from "./companies.repository.js";
import { AppError } from "../../utils/AppError.js";
import type {
  CompanyUpdateData,
  CompanyWriteData,
} from "./company.security.js";

export class CompaniesService {
  constructor(
    private readonly companiesRepository = new CompaniesRepository(),
  ) {}

  async listCompanies() {
    try {
      
      return this.companiesRepository.listAll();
    } catch (error) {
      console.log(error)
    }
  }

  async findCompanyById(id: string) {
    return this.companiesRepository.findById(id);
  }

  async createCompany(data: CompanyWriteData) {
    try {
      return await this.companiesRepository.create(data);
    } catch (error) {
      throw mapCompanyPersistenceError(error);
    }
  }

  async updateCompany(id: string, data: CompanyUpdateData) {
    try {
      return await this.companiesRepository.update(id, data);
    } catch (error) {
      throw mapCompanyPersistenceError(error);
    }
  }

  async deactivateCompany(id: string) {
    return this.companiesRepository.deactivate(id);
  }
}

/**
 * Converte a violação do índice único de CNPJ em um erro operacional estável,
 * sem expor detalhes internos do Prisma na resposta HTTP.
 */
function mapCompanyPersistenceError(error: unknown): Error {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  ) {
    return new AppError("CNPJ já cadastrado", 409);
  }

  return error instanceof Error ? error : new Error("Erro ao persistir empresa");
}

/*
 * O service mantém o controller independente do Prisma e deixa a regra de
 * persistência substituível nos testes por um repository compatível.
 */
