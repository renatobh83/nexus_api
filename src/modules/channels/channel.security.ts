import type { Channel, Prisma } from "@prisma/client";

export type PublicChannel = Omit<
  Channel,
  | "session"
  | "qrcode"
  | "pairingCode"
  | "tokenTelegram"
  | "phone"
  | "wabaBSP"
  | "tokenAPI"
  | "tokenHook"
>;

export type ChannelUpdateData = Partial<
  Pick<
    Prisma.ChannelCreateInput,
    | "name"
    | "type"
    | "number"
    | "wppUser"
    | "pairingCodeEnabled"
    | "isActive"
    | "isDefault"
    | "farewellMessage"
    | "tokenTelegram"
    | "wabaBSP"
    | "tokenAPI"
    | "tokenHook"
  >
>;

export type ChannelCreateData = ChannelUpdateData & {
  name: string;
  type: string;
};

export type ChannelMessageData = Readonly<{
  to: string;
  body: string;
}>;

const SUPPORTED_CHANNEL_TYPES = new Set([
  "whatsapp",
  "telegram",
  "instagram",
  "messenger",
  "web",
  "waba",
  "wpp-business",
]);

const CHANNEL_STRING_FIELDS = {
  name: { maxLength: 100, nullable: false },
  type: { maxLength: 50, nullable: false },
  number: { maxLength: 40, nullable: true },
  wppUser: { maxLength: 40, nullable: true },
  farewellMessage: { maxLength: 5_000, nullable: true },
  tokenTelegram: { maxLength: 8_192, nullable: true },
  wabaBSP: { maxLength: 8_192, nullable: true },
  tokenAPI: { maxLength: 8_192, nullable: true },
  tokenHook: { maxLength: 8_192, nullable: true },
} as const;

const CHANNEL_BOOLEAN_FIELDS = [
  "pairingCodeEnabled",
  "isActive",
  "isDefault",
] as const;

const CHANNEL_WRITE_FIELDS = new Set<string>([
  ...Object.keys(CHANNEL_STRING_FIELDS),
  ...CHANNEL_BOOLEAN_FIELDS,
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseBooleanField(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return undefined;

  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  return undefined;
}

function parseChannelWriteData(value: unknown): ChannelUpdateData | undefined {
  if (!isRecord(value)) return undefined;

  const data: Record<string, unknown> = {};
  for (const key of Object.keys(value)) {
    if (!CHANNEL_WRITE_FIELDS.has(key)) return undefined;
  }

  for (const [key, constraints] of Object.entries(CHANNEL_STRING_FIELDS)) {
    if (!Object.hasOwn(value, key)) continue;

    const fieldValue = value[key];
    if (fieldValue === null && constraints.nullable) {
      data[key] = null;
      continue;
    }
    if (typeof fieldValue !== "string") return undefined;

    const normalized = fieldValue.trim();
    if (normalized.length > constraints.maxLength) return undefined;
    if (!constraints.nullable && normalized.length === 0) return undefined;
    data[key] = normalized;
  }

  for (const key of CHANNEL_BOOLEAN_FIELDS) {
    if (!Object.hasOwn(value, key)) continue;

    const parsed = parseBooleanField(value[key]);
    if (parsed === undefined) return undefined;
    data[key] = parsed;
  }

  return data as ChannelUpdateData;
}

/** Remove credenciais e dados de sessão antes de devolver um canal pela API. */
export function toPublicChannel(channel: Channel): PublicChannel {
  const {
    session,
    qrcode,
    pairingCode,
    tokenTelegram,
    phone,
    wabaBSP,
    tokenAPI,
    tokenHook,
    ...publicChannel
  } = channel;
  return publicChannel;
}

/** Converte o identificador da rota sem aceitar prefixos ou valores não positivos. */
export function parseChannelId(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value > 0 ? value : undefined;
  }
  if (typeof value !== "string" || !/^\d+$/.test(value.trim())) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

/** Valida os campos permitidos na criação e exige nome e tipo de canal. */
export function parseChannelCreateData(
  value: unknown,
): ChannelCreateData | undefined {
  const data = parseChannelWriteData(value);
  if (!data || typeof data.name !== "string") return undefined;

  const type = data.type ?? "whatsapp";
  if (!SUPPORTED_CHANNEL_TYPES.has(type)) return undefined;

  return { ...data, type } as ChannelCreateData;
}

/** Valida uma edição parcial e impede payloads vazios ou com campos administrativos. */
export function parseChannelUpdateData(
  value: unknown,
): ChannelUpdateData | undefined {
  const data = parseChannelWriteData(value);
  if (!data || Object.keys(data).length === 0) return undefined;
  if (data.type !== undefined && typeof data.type === "string") {
    if (!SUPPORTED_CHANNEL_TYPES.has(data.type)) return undefined;
  }

  return data;
}

/** Normaliza telefone brasileiro ou valida um identificador de chat WhatsApp. */
export function normalizeChannelDestination(
  value: unknown,
  channelType: string,
): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  if (!normalized || normalized.length > 256) return undefined;
  if (/[\u0000-\u001f\u007f]/.test(normalized)) return undefined;

  if (channelType !== "whatsapp") return normalized;

  if (normalized.includes("@")) {
    return /^[a-z0-9._-]{1,80}@(c\.us|g\.us|s\.whatsapp\.net|broadcast|lid|newsletter)$/i.test(
      normalized,
    )
      ? normalized
      : undefined;
  }

  if (!/^\+?[\d\s().-]+$/.test(normalized)) return undefined;
  let digits = normalized.replace(/\D/g, "");
  if (!digits.startsWith("55")) {
    digits = digits.replace(/^0+/, "");
    digits = `55${digits}`;
  }

  if (digits.length !== 12 && digits.length !== 13) return undefined;
  return `+${digits}`;
}

/** Valida os campos textuais da rota de envio e normaliza o destino por canal. */
export function parseChannelMessageData(
  value: unknown,
  channelType: string,
): ChannelMessageData | undefined {
  if (!isRecord(value)) return undefined;
  if (Object.keys(value).some((key) => !["to", "body"].includes(key))) {
    return undefined;
  }

  const to = normalizeChannelDestination(value.to, channelType);
  if (!to) return undefined;

  if (value.body !== undefined && typeof value.body !== "string") {
    return undefined;
  }
  const body = typeof value.body === "string" ? value.body : "";
  if (body.length > 10_000) return undefined;

  return { to, body };
}
