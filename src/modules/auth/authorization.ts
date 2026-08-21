import { AuthClaims, getClaimRole, getClaimSubject } from "./jwt.js";

export interface TicketAccessRecord {
  userId?: string | number | null;
  status?: string | null;
}

export function hasRole(claims: AuthClaims | undefined, role: string): boolean {
  const currentRole = getClaimRole(claims || {})?.toLowerCase();
  return currentRole === role.toLowerCase();
}

export function isAdministrator(claims: AuthClaims | undefined): boolean {
  return hasRole(claims, "administrador");
}

export function canAccessTicket(
  claims: AuthClaims | undefined,
  ticket: TicketAccessRecord | null | undefined,
): boolean {
  if (!claims || !ticket) return false;

  const role = getClaimRole(claims)?.toLowerCase();
  if (role !== "administrador" && role !== "atendente") return false;
  if (isAdministrator(claims)) return true;

  // Tickets pendentes pertencem à fila de atendimento e podem ser vistos
  // por atendentes autenticados.
  if (ticket.status === "pending") return true;

  const subject = getClaimSubject(claims);
  return Boolean(
    subject && ticket.userId !== null && ticket.userId !== undefined
      ? String(ticket.userId) === subject
      : false,
  );
}

export function getAuthenticatedSubject(
  claims: AuthClaims | undefined,
): string | undefined {
  return getClaimSubject(claims || {});
}
