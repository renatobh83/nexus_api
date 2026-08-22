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
  apiKey?: string | null;
  webhookSecret?: string | null;
  [key: string]: unknown;
}

const MASKED_SECRET_VALUE = "[REDACTED]";
const SENSITIVE_SETTINGS_FIELDS = ["apiKey", "webhookSecret"] as const;

interface CreateOrUpdateConfigData {
  integrationName: string;
  clientId: string;
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
    const normalizedIntegrationName = this.normalizeRequiredField(
      "integrationName",
      integrationName,
    );
    const normalizedClientId = this.normalizeRequiredField("clientId", clientId);

    logger.info("Criando/atualizando configuração de integração", {
      integrationName: normalizedIntegrationName,
      clientId: normalizedClientId,
    });
    if (typeof settings === "string") {
      settings = JSON.parse(settings);
    }
    if (!settings || typeof settings !== "object") {
      throw new AppError("JSON_INVALID", 400);
    }
    const existingConfig =
      await this.integrationConfigRepository.findIntegracaoConfig({
        integrationName: normalizedIntegrationName,
        clientId: normalizedClientId,
      });
    const encryptedSettings = this.encryptSensitiveFields(
      settings,
      existingConfig?.settings,
    );

    const data: CreateOrUpdateConfigData = {
      integrationName: normalizedIntegrationName,
      clientId: normalizedClientId,
      settings: encryptedSettings as unknown as PrismaJsonField,
      isActive,
    };

    const config = await this.integrationConfigRepository.createOrUpdate(data);

    logger.info("Configuração salva com sucesso", {
      integrationName: normalizedIntegrationName,
      clientId: normalizedClientId,
    });

    return this.sanitizeIntegrationConfig(config);
  }

  async updateIntegrationConfigById(
    id: string,
    integrationName: string,
    settings: IntegrationSettings,
    clientId: string | null = null,
    isActive = true,
  ) {
    this.normalizeRequiredField("integracaoId", id);
    const normalizedIntegrationName = this.normalizeRequiredField(
      "integrationName",
      integrationName,
    );
    const normalizedClientId = this.normalizeRequiredField("clientId", clientId);

    if (typeof settings === "string") {
      settings = JSON.parse(settings);
    }
    if (!settings || typeof settings !== "object") {
      throw new AppError("JSON_INVALID", 400);
    }

    const existingConfig =
      await this.integrationConfigRepository.findIntegracaoConfig({ id });
    if (!existingConfig) {
      throw new AppError("Configuração de integração não encontrada", 404);
    }

    const encryptedSettings = this.encryptSensitiveFields(
      settings,
      existingConfig.settings,
    );
    const config = await this.integrationConfigRepository.updateById(id, {
      integrationName: normalizedIntegrationName,
      clientId: normalizedClientId,
      settings: encryptedSettings as unknown as Prisma.InputJsonValue,
      isActive,
    });

    return this.sanitizeIntegrationConfig(config);
  }

  // Atualiza o registro indicado pelo path e devolve somente a forma
  // administrativa sanitizada, sem expor os valores descriptografados.
  async deleteIntegrationService(id: string) {
    return await this.integrationConfigRepository.deteleIntegracao(id);
  }

  async getIntegrationConfig(integrationName: string, clientId: string) {
    const normalizedIntegrationName = this.normalizeRequiredField(
      "integrationName",
      integrationName,
    );
    const normalizedClientId = this.normalizeRequiredField("clientId", clientId);

    logger.info("Buscando configuração de integração", {
      integrationName: normalizedIntegrationName,
      clientId: normalizedClientId,
    });

    const config = await this.integrationConfigRepository.findIntegracaoConfig({
      integrationName: normalizedIntegrationName,
      clientId: normalizedClientId,
      isActive: true,
    });

    if (!config) {
      logger.warn("Configuração não encontrada", {
        integrationName: normalizedIntegrationName,
        clientId: normalizedClientId,
      });
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
  async loadIntegracoes(clientId?: string) {
    const normalizedClientId =
      clientId === undefined
        ? undefined
        : this.normalizeRequiredField("clientId", clientId);
    const configs = await this.integrationConfigRepository.listaAll(
      normalizedClientId,
    );
    return configs.map((config) => this.sanitizeIntegrationConfig(config));
  }
  async updateTicketIntegration(ticketId: number, data: TicketUpdateData) {
    this.normalizeRequiredField("ticketId", String(ticketId));

    logger.info("Atualizando ticket", { ticketId });
    return await this.integrationConfigRepository.updateTicket(ticketId, data);
  }

  async findTicketIntegrationn(
    contatoId: string,
    integrationSource: string,
  ) {
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
    existingSettings?: Prisma.JsonValue,
  ): IntegrationSettings {
    const encrypted = { ...settings };
    const existing = this.asIntegrationSettings(existingSettings);

    for (const field of SENSITIVE_SETTINGS_FIELDS) {
      const value = settings[field];
      const existingValue = existing[field];

      // O painel recebe o segredo mascarado. Nesse caso, mantém o valor
      // persistido em vez de criptografar o marcador novamente.
      if (value === MASKED_SECRET_VALUE || value === undefined) {
        if (typeof existingValue === "string" && existingValue.length > 0) {
          encrypted[field] = existingValue;
        } else {
          delete encrypted[field];
        }
        continue;
      }

      // `null` é o sinal explícito para remover um segredo já salvo.
      if (value === null) {
        delete encrypted[field];
        continue;
      }

      if (typeof value !== "string") {
        throw new AppError(`O campo "${field}" deve ser uma string`, 400);
      }

      if (value.length > 0) {
        encrypted[field] = this.safeEncrypt(value, field);
      }
    }

    return encrypted;
  }

  /**
   * Oculta segredos nas respostas administrativas sem descriptografá-los.
   */
  private sanitizeIntegrationConfig<T extends { settings: Prisma.JsonValue }>(
    config: T,
  ): Omit<T, "settings"> & { settings: IntegrationSettings } {
    return {
      ...config,
      settings: this.maskSensitiveFields(
        this.asIntegrationSettings(config.settings),
      ),
    };
  }

  /**
   * Substitui somente valores existentes dos campos sensíveis por um marcador.
   */
  private maskSensitiveFields(
    settings: IntegrationSettings,
  ): IntegrationSettings {
    const masked = { ...settings };

    for (const field of SENSITIVE_SETTINGS_FIELDS) {
      if (typeof masked[field] === "string" && masked[field]!.length > 0) {
        masked[field] = MASKED_SECRET_VALUE;
      }
    }

    return masked;
  }

  /**
   * Converte uma configuração JSON do Prisma para o shape interno esperado.
   */
  private asIntegrationSettings(
    settings: Prisma.JsonValue | undefined,
  ): IntegrationSettings {
    if (
      settings &&
      typeof settings === "object" &&
      !Array.isArray(settings)
    ) {
      return settings as IntegrationSettings;
    }

    return {};
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

  private normalizeRequiredField(
    fieldName: string,
    value: string | null | undefined,
  ): string {
    if (typeof value !== "string" || value.trim() === "") {
      throw new AppError(`O campo "${fieldName}" é obrigatório`, 400);
    }

    return value.trim();
  }
}
