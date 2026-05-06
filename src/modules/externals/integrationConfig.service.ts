import { Prisma } from "@prisma/client";
import { decrypt, encrypt } from "../../utils/encryption.js";
import { IntegrationConfigRepository } from "./integrationConfig.repository.js";
import { prisma } from "../../lib/prisma.js";

export class IntegracaoService {
  private integrationConfigRepository: IntegrationConfigRepository;
  constructor() {
    this.integrationConfigRepository = new IntegrationConfigRepository();
  }

  async createOrUpdateIntegrationConfig(
    integrationName: string,
    settings: any,
    clientId = null,
  ) {
    // Criptografar dados sensíveis antes de salvar
    const encryptedSettings = { ...settings };

    if (encryptedSettings.apiKey) {
      encryptedSettings.apiKey = encrypt(encryptedSettings.apiKey);
    }
    if (encryptedSettings.webhookSecret) {
      encryptedSettings.webhookSecret = encrypt(
        encryptedSettings.webhookSecret,
      );
    }

    const data = {
      integrationName,
      clientId,
      settings: encryptedSettings, // Salva o objeto JSON criptografado
    };
    const config = await this.integrationConfigRepository.createOrUpdate(data);
    return config;
  }
  async getIntegrationConfig(integrationName: string, clientId: string) {
    const config = await this.integrationConfigRepository.findIntegracaoConfig({
      integrationName,
      clientId,
      isActive: true,
    });

    if (!config) return null;
    const decryptedSettings = {
      ...(config.settings as Record<string, unknown>),
    };
    if (decryptedSettings.apiKey) {
      decryptedSettings.apiKey = decrypt(decryptedSettings.apiKey as string);
    }
    if (decryptedSettings.webhookSecret) {
      decryptedSettings.webhookSecret = decrypt(
        decryptedSettings.webhookSecret as string,
      );
    }

    return { ...config, settings: decryptedSettings };
  }
  async createTicketForIntegration(data: any) {
    const ticketExist =
      await this.integrationConfigRepository.findExistsTicketOpen(data);

    if (ticketExist) {
      const procArr = Array.isArray(data.metadata.procedimentos)
        ? data.metadata.procedimentos
        : [data.metadata.procedimentos];
      const idExtArr = Array.isArray(data.metadata.idExterno)
        ? data.metadata.idExterno
        : [data.metadata.idExterno];

      const currentMetadata = ticketExist?.metadata || ({} as any);
      const currentIdexterno = (currentMetadata.idexterno || []).filter(
        (id: null) => id !== null,
      );
      const validIdExtArr = (idExtArr || []).filter(
        (id: null | undefined) => id !== null && id !== undefined,
      );

      const novosIds = validIdExtArr.filter(
        (id: any) => !currentIdexterno.includes(id),
      );
      const novoIdexterno = [...currentIdexterno, ...novosIds];

      await prisma.ticket.update({
        where: { id: ticketExist.id },
        data: {
          metadata: {
            ...currentMetadata,
            idexterno: novoIdexterno,
            procedimentos: [
              ...new Set([
                ...(currentMetadata.procedimentos || []),
                ...(procArr || []).filter((p: null) => p !== null),
              ]),
            ],
            atendimentoHora:
              !currentMetadata.atendimentoHora ||
              currentMetadata.atendimentoHora > data.metadata.atendimentoHora
                ? data.metadata.atendimentoHora
                : currentMetadata.atendimentoHora,
          },
        },
      });
      return ticketExist;
    }

    return await this.integrationConfigRepository.createTicketForIntegration(
      data,
    );
  }
}
