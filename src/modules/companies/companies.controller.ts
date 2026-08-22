import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../../utils/AppError.js";
import {
  parseCompanyId,
  parseCompanyWriteData,
  toPublicCompany,
} from "./company.security.js";
import { CompaniesService } from "./companies.service.js";

const companiesService = new CompaniesService();

interface CompanyParams {
  companyId?: unknown;
}

/**
 * Registra os endpoints administrativos de empresas.
 * A rota é registrada no escopo de administradores em `src/api/routes/index.ts`.
 */
export async function companiesController(fastify: FastifyInstance) {
  fastify.get("/", async (_request: FastifyRequest, reply: FastifyReply) => {
    const companies = await companiesService.listCompanies();
    return reply.status(200).send(companies.map(toPublicCompany));
  });

  fastify.get(
    "/:companyId",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const companyId = parseCompanyId(
        (request.params as CompanyParams).companyId,
      );

      if (!companyId) {
        throw new AppError("ID de empresa inválido", 400);
      }

      const company = await companiesService.findCompanyById(companyId);
      if (!company) {
        throw new AppError("Empresa não encontrada", 404);
      }

      return reply.status(200).send(toPublicCompany(company));
    },
  );

  fastify.post(
    "/",
    async (request: FastifyRequest, reply: FastifyReply) => {
      
      const companyData = parseCompanyWriteData(request.body, "create");

      if (!companyData) {
        throw new AppError("Dados de empresa inválidos", 400);
      }

      const company = await companiesService.createCompany(companyData);
      return reply.status(201).send(toPublicCompany(company));
    },
  );

  fastify.put(
    "/:companyId",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const companyId = parseCompanyId(
        (request.params as CompanyParams).companyId,
      );
      const companyData = parseCompanyWriteData(request.body, "update");

      if (!companyId) {
        throw new AppError("ID de empresa inválido", 400);
      }

      if (!companyData) {
        throw new AppError("Dados de empresa inválidos", 400);
      }

      const company = await companiesService.updateCompany(
        companyId,
        companyData,
      );
      if (!company) {
        throw new AppError("Empresa não encontrada", 404);
      }

      return reply.status(200).send(toPublicCompany(company));
    },
  );

  fastify.delete(
    "/:companyId",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const companyId = parseCompanyId(
        (request.params as CompanyParams).companyId,
      );

      if (!companyId) {
        throw new AppError("ID de empresa inválido", 400);
      }

      const result = await companiesService.deactivateCompany(companyId);
      if (result.count === 0) {
        throw new AppError("Empresa não encontrada ou já desativada", 404);
      }

      return reply.status(204).send();
    },
  );
}

/*
 * O controller não recebe campos livres: toda entrada passa pelo parser que
 * normaliza CNPJ e dados cadastrais antes de chegar ao service.
 */
