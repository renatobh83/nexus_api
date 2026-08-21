import { Prisma } from "@prisma/client";
import { IntegrationConfigRepository } from "./integrationConfig.repository.js";
import { decrypt, encrypt } from "../../utils/encryption.js";
import { AppError } from "../../utils/AppError.js";

// ─── Tipos base do Prisma ─────────────────────────────────────────────────────

type PrismaJsonField = Prisma.NullTypes.JsonNull | Prisma.InputJsonValue;

/**
 * Representa o campo `metadata Json?` e `apiConfig Json?` lidos do banco.
 * Ao ler, o Prisma retorna JsonValue — fazemos cast para Record<string, unknown>
 * apenas internamente no service para acessar as chaves com segurança.
 */
type TicketMetadataJson = Record<string, unknown>;

// ─── Tipos de entrada do service ─────────────────────────────────────────────

/**
 * Dados de entrada para criação de ticket.
 * Estende Prisma.TicketCreateInput para garantir compatibilidade total
 * com o repository, adicionando o shape do metadata esperado.
 */
type TicketCreateData = Prisma.TicketCreateInput & {
  metadata?: {
    procedimentos?: string | string[];
    idExterno?: string | string[];
    atendimentoHora?: string;
    [key: string]: unknown;
  };
};

/**
 * Dados de entrada para atualização parcial de ticket.
 * Usa Prisma.TicketUpdateInput diretamente — já aceita Partial por natureza.
 */
type TicketUpdateData = Prisma.TicketUpdateInput;

interface UpdateTicketData {
  ticketId: number;
  currentMetadata: TicketMetadataJson;
  atendimentoHora: string;
  idexterno: number[]; // ← corrigido
  procArr: number[];
}
// ─── Tipos de configuração de integração ─────────────────────────────────────

interface IntegrationSettings {
  apiKey?: string;
  webhookSecret?: string;
  [key: string]: unknown;
}

interface CreateOrUpdateConfigData {
  integrationName: string;
  clientId: string | null;
  settings: PrismaJsonField;
  isActive: boolean;
}

// ─── Logger simples (substitua pelo seu logger real, ex: winston/pino) ────────

const logger = {
  info: (msg: string, meta?: Record<string, unknown>) =>
    console.info(`[INFO] ${msg}`, meta ?? ""),
  warn: (msg: string, meta?: Record<string, unknown>) =>
    console.warn(`[WARN] ${msg}`, meta ?? ""),
  error: (msg: string, meta?: Record<string, unknown>) =>
    console.error(`[ERROR] ${msg}`, meta ?? ""),
};

// ─── Service ──────────────────────────────────────────────────────────────────

export class IntegracaoService {
  private integrationConfigRepository: IntegrationConfigRepository;

  constructor() {
    this.integrationConfigRepository = new IntegrationConfigRepository();
  }

  // ── Métodos Públicos ────────────────────────────────────────────────────────

  async createOrUpdateIntegrationConfig(
    integrationName: string,
    settings: IntegrationSettings,
    clientId: string | null = null,
    isActive = true,
  ) {
    this.validateRequiredField("integrationName", integrationName);

    logger.info("Criando/atualizando configuração de integração", {
      integrationName,
      clientId,
    });
    if (typeof settings === "string") {
      settings = JSON.parse(settings);
    }
    if (!settings || typeof settings !== "object") {
      throw new AppError("JSON_INVALID", 400);
    }
    const encryptedSettings = this.encryptSensitiveFields(settings);

    const data: CreateOrUpdateConfigData = {
      integrationName,
      clientId,
      settings: encryptedSettings as unknown as PrismaJsonField,
      isActive,
    };

    const config = await this.integrationConfigRepository.createOrUpdate(data);

    logger.info("Configuração salva com sucesso", {
      integrationName,
      clientId,
    });

    return config;
  }

  async deleteIntegrationService(id: string) {
    return await this.integrationConfigRepository.deteleIntegracao(id);
  }

  async getIntegrationConfig(integrationName: string, clientId: string) {
    this.validateRequiredField("integrationName", integrationName);
    this.validateRequiredField("clientId", clientId);

    logger.info("Buscando configuração de integração", {
      integrationName,
      clientId,
    });

    const config = await this.integrationConfigRepository.findIntegracaoConfig({
      integrationName,
      clientId,
      isActive: true,
    });

    if (!config) {
      logger.warn("Configuração não encontrada", { integrationName, clientId });
      return null;
    }

    const rawSettings = config.settings as unknown as IntegrationSettings;
    const decryptedSettings = this.decryptSensitiveFields(rawSettings);

    return { ...config, settings: decryptedSettings };
  }

  async createTicketForIntegration(data: TicketCreateData) {
    if (
      typeof data.integrationSource !== "string" ||
      data.integrationSource.trim().length === 0
    ) {
      throw new AppError(
        "integrationSource é obrigatório para tickets de integração",
        400,
      );
    }

    const integrationSource = data.integrationSource.trim();
    const idExterno = this.toArray(data.metadata?.idExterno)
      .map(Number)
      .filter((n) => !isNaN(n));

    const findInput = {
      contato: data.contato as string,
      integrationSource,
      metadata: {
        idexterno: idExterno.length ? idExterno : undefined,
        answered: false,
      },
    };
    const ticketExist =
      await this.integrationConfigRepository.findExistsTicketOpen(findInput);

    if (ticketExist) {
      logger.info("Ticket já existente, atualizando", {
        ticketId: ticketExist.id,
      });

      const updateData = this.mergeTicketMetadata(ticketExist, data);

      return await this.integrationConfigRepository.updateTicketIntegration(
        updateData,
      );
    }

    logger.info("Criando novo ticket de integração");
    return await this.integrationConfigRepository.createTicketForIntegration(
      data,
    );
  }
  async loadIntegracoes() {
    return this.integrationConfigRepository.listaAll();
  }
  async updateTicketIntegration(ticketId: number, data: TicketUpdateData) {
    this.validateRequiredField("ticketId", String(ticketId));

    logger.info("Atualizando ticket", { ticketId });
    return await this.integrationConfigRepository.updateTicket(ticketId, data);
  }

  async findTicketIntegrationn(contatoId: string, integrationSource: string) {
    if (!integrationSource.trim()) {
      throw new AppError(
        "integrationSource é obrigatório para localizar tickets de integração",
        400,
      );
    }

    return await this.integrationConfigRepository.findTicketIntegration(
      contatoId,
      integrationSource.trim(),
    );
  }

  // ── Métodos Privados ────────────────────────────────────────────────────────

  /**
   * Faz o merge do campo `metadata Json?` do ticket existente com os novos dados.
   *
   * O metadata vem do Prisma como JsonValue — fazemos cast para TicketMetadataJson
   * (Record<string, unknown>) apenas aqui dentro, para acessar as chaves com segurança,
   * sem afetar a tipagem do repository.
   */
  private mergeTicketMetadata(
    ticketExist: { id: number; metadata?: Prisma.JsonValue },
    data: TicketCreateData,
  ): UpdateTicketData {
    const incomingMetadata = data.metadata ?? {};
    const procArr = this.toArray(
      incomingMetadata.procedimentos,
    ) as unknown as number[];
    const idExtArr = this.toArray(incomingMetadata.idExterno)
      .map(Number)
      .filter((n) => !isNaN(n));

    const currentMetadata = (ticketExist.metadata ?? {}) as TicketMetadataJson;

    const currentIdExterno = ((currentMetadata["idexterno"] as unknown[]) ?? [])
      .map(Number)
      .filter((n): n is number => !isNaN(n));
    const novosIds = idExtArr
      .map(Number)
      .filter((n): n is number => !isNaN(n) && !currentIdExterno.includes(n));

    return {
      ticketId: ticketExist.id,
      currentMetadata,
      atendimentoHora: incomingMetadata.atendimentoHora ?? "",
      idexterno: [...currentIdExterno, ...novosIds], // agora number[]
      procArr,
    };
  }
  private encryptSensitiveFields(
    settings: IntegrationSettings,
  ): IntegrationSettings {
    const encrypted = { ...settings };

    if (encrypted.apiKey) {
      encrypted.apiKey = this.safeEncrypt(encrypted.apiKey, "apiKey");
    }
    if (encrypted.webhookSecret) {
      encrypted.webhookSecret = this.safeEncrypt(
        encrypted.webhookSecret,
        "webhookSecret",
      );
    }

    return encrypted;
  }

  private decryptSensitiveFields(
    settings: IntegrationSettings,
  ): IntegrationSettings {
    const decrypted = { ...settings };

    if (decrypted.apiKey) {
      decrypted.apiKey = this.safeDecrypt(decrypted.apiKey, "apiKey");
    }
    if (decrypted.webhookSecret) {
      decrypted.webhookSecret = this.safeDecrypt(
        decrypted.webhookSecret,
        "webhookSecret",
      );
    }

    return decrypted;
  }

  private safeEncrypt(value: string, fieldName: string): string {
    try {
      return encrypt(value);
    } catch (error) {
      logger.error("Falha ao criptografar campo", { fieldName, error });
      throw new Error(`Erro ao processar o campo "${fieldName}"`);
    }
  }

  private safeDecrypt(value: string, fieldName: string): string {
    try {
      return decrypt(value);
    } catch (error) {
      logger.error("Falha ao descriptografar campo", { fieldName, error });
      throw new Error(`Erro ao processar o campo "${fieldName}"`);
    }
  }

  private toArray<T>(value: T | T[] | undefined | null): T[] {
    if (value === null || value === undefined) return [];
    return Array.isArray(value) ? value : [value];
  }

  private validateRequiredField(fieldName: string, value: string): void {
    if (!value || value.trim() === "") {
      throw new Error(`O campo "${fieldName}" é obrigatório`);
    }
  }
}
