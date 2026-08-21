const MAX_CLOSE_REASON_LENGTH = 500;

export type ChatWebClosedEvent = Readonly<{
  ticketId: number;
  reason?: string;
}>;

type ChatWebCloseEmitter = {
  emit: (event: "ChatWebFechado", payload: ChatWebClosedEvent) => unknown;
};

export type ChatWebCloseNamespace = {
  to: (room: string) => ChatWebCloseEmitter;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Converte somente um identificador inteiro positivo seguro em nome de sala. */
export function getChatWebTicketRoom(ticketId: unknown): string | undefined {
  if (
    (typeof ticketId !== "number" && typeof ticketId !== "string") ||
    (typeof ticketId === "string" && !/^\d+$/.test(ticketId))
  ) {
    return undefined;
  }

  const parsed = Number(ticketId);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return undefined;

  return `ticket-${parsed}`;
}

/** Mantém apenas o motivo textual limitado e substitui qualquer ticket enviado pelo cliente pelo valor do servidor. */
export function normalizeChatWebClosedEvent(
  value: unknown,
  ticketId: number,
): ChatWebClosedEvent {
  const reason = isRecord(value) && typeof value.reason === "string"
    ? value.reason.trim().slice(0, MAX_CLOSE_REASON_LENGTH)
    : undefined;

  return reason ? { ticketId, reason } : { ticketId };
}

/** Emite o fechamento exclusivamente na sala do ticket previamente resolvido no servidor. */
export function emitChatWebClosedToTicket(
  namespace: ChatWebCloseNamespace,
  ticketId: number,
  value: unknown,
): void {
  const room = getChatWebTicketRoom(ticketId);
  if (!room) return;

  namespace
    .to(room)
    .emit("ChatWebFechado", normalizeChatWebClosedEvent(value, ticketId));
}
