/**
 * marketAlertMessage.ts
 *
 * Converte o evento `market.alert.created` na mensagem final enviada ao usuário.
 * Saída determinística — mesmo payload sempre gera o mesmo texto.
 */

export type AlertChannel = "whatsapp" | "telegram" | "email";

export interface MarketAlert {
  deliveryId: number;
  alertId: number;
  userId: number;
  ticker?: string;
  title?: string;
  body?: string;
  movementPercent?: number;
}

export interface MarketAlertEvent {
  event: string;
  version: number;
  occurredAt: string;
  channel: string;
  recipient: string;
  alert: MarketAlert;
}

export interface BuildMessageOptions {
  /** Inclui a linha com data/hora do evento. Padrão: true */
  includeTimestamp?: boolean;
  /** Fuso usado para exibir o horário. Padrão: 'America/Sao_Paulo' */
  timeZone?: string;
  /** Aviso final. Passe string vazia para omitir (não recomendado). */
  disclaimer?: string;
}

export class InvalidAlertEventError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidAlertEventError";
  }
}

const EVENT_NAME = "market.alert.created";
const DEFAULT_DISCLAIMER =
  "Alerta informativo. Não é recomendação de investimento.";
const SUPPORTED_CHANNELS: AlertChannel[] = ["whatsapp", "telegram", "email"];

/* -------------------------------------------------------------------------- */
/* Formatação por canal                                                        */
/* -------------------------------------------------------------------------- */

function escapeForChannel(text: string, channel: AlertChannel): string {
  if (channel === "telegram") {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  return text;
}

function bold(text: string, channel: AlertChannel): string {
  switch (channel) {
    case "whatsapp":
      return `*${text}*`;
    case "telegram":
      return `<b>${text}</b>`;
    default:
      return text;
  }
}

function italic(text: string, channel: AlertChannel): string {
  switch (channel) {
    case "whatsapp":
      return `_${text}_`;
    case "telegram":
      return `<i>${text}</i>`;
    default:
      return text;
  }
}

function resolveChannel(channel: unknown): AlertChannel {
  const normalized = String(channel ?? "")
    .trim()
    .toLowerCase();
  return SUPPORTED_CHANNELS.includes(normalized as AlertChannel)
    ? (normalized as AlertChannel)
    : "email"; // canal desconhecido -> texto puro
}

/* -------------------------------------------------------------------------- */
/* Formatação de valores                                                       */
/* -------------------------------------------------------------------------- */

/** 12 -> "12,00%" | -6.5 -> "6,50%" (sempre em módulo; a direção vai no texto) */
function formatPercent(value: number): string {
  return `${Math.abs(value).toFixed(2).replace(".", ",")}%`;
}

/** "2026-08-25T14:30:00.000Z" -> "25/08 às 11h30" */
function formatOccurredAt(occurredAt: string, timeZone: string): string | null {
  const date = new Date(occurredAt);
  if (Number.isNaN(date.getTime())) return null;

  try {
    const parts = new Intl.DateTimeFormat("pt-BR", {
      timeZone,
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(date);

    const get = (type: string) =>
      parts.find((p) => p.type === type)?.value ?? "";
    const day = get("day");
    const month = get("month");
    const hour = get("hour");
    const minute = get("minute");

    if (!day || !month || !hour || !minute) return null;
    return `${day}/${month} às ${hour}h${minute}`;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Validação                                                                   */
/* -------------------------------------------------------------------------- */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Valida o formato mínimo do evento. Lança InvalidAlertEventError se inválido. */
export function assertMarketAlertEvent(
  payload: unknown,
): asserts payload is MarketAlertEvent {
  if (!isRecord(payload)) {
    throw new InvalidAlertEventError("Payload não é um objeto.");
  }
  if (payload.event !== EVENT_NAME) {
    throw new InvalidAlertEventError(
      `Evento não suportado: ${String(payload.event)}`,
    );
  }
  if (!isRecord(payload.alert)) {
    throw new InvalidAlertEventError('Campo "alert" ausente ou inválido.');
  }
}

/* -------------------------------------------------------------------------- */
/* Montagem da mensagem                                                        */
/* -------------------------------------------------------------------------- */

interface Movement {
  kind: "up" | "down" | "flat";
  emoji: string;
  /** Ex.: "alta de 12,00%" */
  phrase: string | null;
}

function resolveMovement(movementPercent: unknown): Movement {
  const value =
    typeof movementPercent === "number"
      ? movementPercent
      : Number(movementPercent);

  if (!Number.isFinite(value)) {
    return { kind: "flat", emoji: "🔔", phrase: null };
  }
  if (value > 0) {
    return {
      kind: "up",
      emoji: "📈",
      phrase: `alta de ${formatPercent(value)}`,
    };
  }
  if (value < 0) {
    return {
      kind: "down",
      emoji: "📉",
      phrase: `queda de ${formatPercent(value)}`,
    };
  }
  return { kind: "flat", emoji: "🔔", phrase: null };
}

/**
 * Monta a mensagem final a ser enviada ao usuário.
 *
 * @throws {InvalidAlertEventError} se o payload não for um market.alert.created válido.
 */
export function buildAlertMessage(
  payload: unknown,
  options: BuildMessageOptions = {},
): string {
  assertMarketAlertEvent(payload);

  const {
    includeTimestamp = true,
    timeZone = "America/Sao_Paulo",
    disclaimer = DEFAULT_DISCLAIMER,
  } = options;

  const channel = resolveChannel(payload.channel);
  const alert = payload.alert;

  const rawTicker = typeof alert.ticker === "string" ? alert.ticker.trim() : "";
  const tickerLabel = rawTicker
    ? escapeForChannel(rawTicker, channel)
    : "O ativo monitorado";

  const movement = resolveMovement(alert.movementPercent);
  const useEmoji = channel !== "email";

  const lines: string[] = [];

  // Linha 1 — ativo + movimento
  const prefix = useEmoji ? `${movement.emoji} ` : "";
  const subject = rawTicker ? bold(tickerLabel, channel) : tickerLabel;

  if (movement.phrase) {
    const [direction, , percent] = movement.phrase.split(" ");
    lines.push(
      `${prefix}${subject} registrou ${direction} de ${bold(percent, channel)}.`,
    );
  } else {
    lines.push(`${prefix}${subject} registrou movimento relevante.`);
  }

  // Linha 2 — contexto
  lines.push(
    movement.kind === "flat"
      ? "A variação atingiu uma condição que você configurou para este ativo."
      : "O movimento atingiu o patamar que você configurou para receber aviso.",
  );

  // Linha 3 — horário (opcional)
  if (includeTimestamp && typeof payload.occurredAt === "string") {
    const when = formatOccurredAt(payload.occurredAt, timeZone);
    if (when) lines.push(`Registrado em ${when}.`);
  }

  // Linha 4 — aviso legal
  if (disclaimer) {
    lines.push(italic(escapeForChannel(disclaimer, channel), channel));
  }

  return lines.join("\n\n");
}

/**
 * Variante que não lança: retorna null quando o payload é inválido.
 * Útil para não derrubar o worker de entrega.
 */
export function tryBuildAlertMessage(
  payload: unknown,
  options: BuildMessageOptions = {},
): string | null {
  try {
    return buildAlertMessage(payload, options);
  } catch {
    return null;
  }
}
