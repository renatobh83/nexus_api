import type { Prisma } from "@prisma/client";
import { AppError } from "../../utils/AppError.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_RESOURCE_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_FLOW_NAME_LENGTH = 120;
const MAX_FLOW_DESCRIPTION_LENGTH = 2_000;
const MAX_FLOW_JSON_BYTES = 2_000_000;
const MAX_FLOW_MODULES = 50;
const MAX_FLOW_NODES = 1_000;
const MAX_PROMPT_NAME_LENGTH = 120;
const MAX_PROMPT_CONTENT_LENGTH = 100_000;

type UnknownRecord = Record<string, unknown>;

export interface FlowWriteData {
  nome: string;
  descricao: string;
  flow_json: Prisma.InputJsonObject;
}

export interface AiPromptCreateData {
  name: string;
  content: string;
}

export interface AiPromptUpdateData {
  name?: string;
  content?: string;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRequiredText(
  value: unknown,
  field: string,
  maxLength: number,
): string {
  if (typeof value !== "string") {
    throw new AppError(`Campo ${field} inválido`, 400);
  }

  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new AppError(`Campo ${field} inválido`, 400);
  }

  return normalized;
}

function readOptionalText(
  value: unknown,
  field: string,
  maxLength: number,
): string {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") {
    throw new AppError(`Campo ${field} inválido`, 400);
  }

  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new AppError(`Campo ${field} inválido`, 400);
  }

  return normalized;
}

function validateFlowDocument(value: unknown): Prisma.InputJsonObject {
  if (!isRecord(value) || !isRecord(value.drawflow)) {
    throw new AppError("Flow inválido: drawflow ausente", 400);
  }

  const modules = value.drawflow;
  const moduleNames = Object.keys(modules);
  if (moduleNames.length === 0 || moduleNames.length > MAX_FLOW_MODULES) {
    throw new AppError("Flow inválido: quantidade de módulos excedida", 400);
  }

  let nodeCount = 0;
  for (const [moduleName, moduleValue] of Object.entries(modules)) {
    if (
      !moduleName.trim() ||
      moduleName.length > 80 ||
      !isRecord(moduleValue)
    ) {
      throw new AppError("Flow inválido: módulo malformado", 400);
    }

    const data = moduleValue.data;
    if (!isRecord(data)) {
      throw new AppError("Flow inválido: dados de módulo ausentes", 400);
    }

    nodeCount += Object.keys(data).length;
    if (nodeCount > MAX_FLOW_NODES) {
      throw new AppError("Flow inválido: quantidade de nodes excedida", 400);
    }
  }

  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw new AppError("Flow inválido", 400);
  }

  if (Buffer.byteLength(serialized, "utf8") > MAX_FLOW_JSON_BYTES) {
    throw new AppError("Flow excede o tamanho máximo permitido", 400);
  }

  return value as Prisma.InputJsonObject;
}

export function parseFlowId(value: unknown): string {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new AppError("ID do flow inválido", 400);
  }

  return value;
}

export function parseFlowWriteData(value: unknown): FlowWriteData {
  if (!isRecord(value)) {
    throw new AppError("Payload de flow inválido", 400);
  }

  return {
    nome: readRequiredText(value.nome, "nome", MAX_FLOW_NAME_LENGTH),
    descricao: readOptionalText(
      value.descricao,
      "descricao",
      MAX_FLOW_DESCRIPTION_LENGTH,
    ),
    flow_json: validateFlowDocument(value.flow),
  };
}

export function parseAiPromptId(value: unknown): string {
  if (typeof value !== "string" || !SAFE_RESOURCE_ID_PATTERN.test(value)) {
    throw new AppError("ID do prompt inválido", 400);
  }

  return value;
}

export function parseAiPromptCreateData(value: unknown): AiPromptCreateData {
  if (!isRecord(value)) {
    throw new AppError("Payload de prompt inválido", 400);
  }

  return {
    name: readRequiredText(value.name, "name", MAX_PROMPT_NAME_LENGTH),
    content: readRequiredText(
      value.content,
      "content",
      MAX_PROMPT_CONTENT_LENGTH,
    ),
  };
}

export function parseAiPromptUpdateData(value: unknown): AiPromptUpdateData {
  if (!isRecord(value)) {
    throw new AppError("Payload de prompt inválido", 400);
  }

  const data: AiPromptUpdateData = {};
  if (value.name !== undefined) {
    data.name = readRequiredText(value.name, "name", MAX_PROMPT_NAME_LENGTH);
  }
  if (value.content !== undefined) {
    data.content = readRequiredText(
      value.content,
      "content",
      MAX_PROMPT_CONTENT_LENGTH,
    );
  }

  if (!data.name && !data.content) {
    throw new AppError("Informe name ou content para atualizar o prompt", 400);
  }

  return data;
}

/**
 * Os parsers aceitam apenas campos funcionais do contrato atual. Identificadores,
 * timestamps, flags operacionais e propriedades desconhecidas ficam fora dos DTOs
 * enviados ao service, evitando mass assignment na camada Prisma.
 */
