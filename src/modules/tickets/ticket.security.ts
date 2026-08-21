const TICKET_ID_PATTERN = /^[1-9]\d*$/;
const USER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_TICKET_STATUSES = new Set(["pending", "open", "closed"]);

export type TicketStatus = "pending" | "open" | "closed";

export interface TicketUpdateBody {
  id?: unknown;
  status?: unknown;
}

/**
 * Converte somente inteiros positivos representados por dígitos decimais em
 * IDs de ticket. Formatos como `1e3`, `1.0`, sinais e espaços internos são
 * rejeitados antes de chegar ao Prisma.
 */
export function parseTicketId(value: unknown): number | null {
  if (typeof value !== "string" || !TICKET_ID_PATTERN.test(value)) {
    return null;
  }

  const ticketId = Number(value);
  return Number.isSafeInteger(ticketId) && ticketId > 0 ? ticketId : null;
}

/**
 * Aceita somente os estados que possuem transição implementada pelo service,
 * impedindo que texto arbitrário corrompa o enum lógico do ticket.
 */
export function parseTicketStatus(value: unknown): TicketStatus | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim().toLowerCase();
  return ALLOWED_TICKET_STATUSES.has(normalized)
    ? (normalized as TicketStatus)
    : null;
}

/**
 * Valida um usuário de destino sem permitir que objetos, strings vazias ou
 * identificadores que não sejam UUID alcancem a relação `user.connect`.
 */
export function parseAssignedUserId(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim();
  return USER_ID_PATTERN.test(normalized) ? normalized : null;
}

/**
 * Diferencia campo ausente de campo presente e inválido, permitindo preservar
 * o contrato legado em que `id` não é necessário para reabrir um ticket como
 * pendente, sem aceitar um valor arbitrário quando o campo é enviado.
 */
export function parseOptionalAssignedUserId(value: unknown): {
  provided: boolean;
  value: string | null;
} {
  if (value === undefined) return { provided: false, value: null };
  return { provided: true, value: parseAssignedUserId(value) };
}

/**
 * Retorna um corpo de atualização somente com campos reconhecidos pelo fluxo
 * de tickets. A validação estrutural permanece no helper para ser testável
 * sem inicializar Fastify ou o cliente Prisma.
 */
export function parseTicketUpdateBody(
  value: unknown,
): { status: TicketStatus; assignedUserId: string | null; assignmentProvided: boolean } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const body = value as TicketUpdateBody;
  const status = parseTicketStatus(body.status);
  if (!status) return null;

  const assignment = parseOptionalAssignedUserId(body.id);
  if (assignment.provided && !assignment.value) return null;

  return {
    status,
    assignedUserId: assignment.value,
    assignmentProvided: assignment.provided,
  };
}
