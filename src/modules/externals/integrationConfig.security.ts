const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Retorna o ID de integração normalizado quando ele possui formato UUID válido.
 * O controller usa `null` para responder 400 antes de alcançar o repository.
 */
export function parseIntegrationConfigId(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim();
  return UUID_PATTERN.test(normalized) ? normalized : null;
}

/**
 * Mantém a validação do identificador fora do controller para permitir testes
 * determinísticos e evitar que valores ambíguos cheguem ao Prisma.
 */
export function isIntegrationConfigId(value: unknown): value is string {
  return parseIntegrationConfigId(value) !== null;
}

export const INTEGRATION_CONFIG_MASKED_SECRET = "[REDACTED]";
