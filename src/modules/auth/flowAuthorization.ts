import type { AuthClaims } from "./jwt.js";

export const FLOW_PERMISSIONS = {
  UPDATE_TICKET: "tickets:update",
} as const;

/**
 * Verifica se as claims pertencem ao executor interno de flows e contêm a
 * permissão exata declarada pela rota, sem aceitar permissões de usuários
 * comuns ou valores parcialmente coincidentes.
 */
export function hasFlowPermission(
  claims: AuthClaims | undefined,
  permission: string,
): boolean {
  if (
    !claims ||
    claims.service !== "flow-executor" ||
    claims.role !== "internal" ||
    !permission.trim()
  ) {
    return false;
  }

  return (
    Array.isArray(claims.permissions) &&
    claims.permissions.some(
      (candidate) =>
        typeof candidate === "string" && candidate.trim() === permission.trim(),
    )
  );
}

/**
 * A lista de permissões permanece em uma claim própria para que o papel
 * `internal` não seja confundido com os papéis humanos `administrador` e
 * `atendente`. Novas permissões devem ser adicionadas somente às rotas que
 * realmente precisam ser chamadas por um flow.
 */
export type FlowPermission =
  (typeof FLOW_PERMISSIONS)[keyof typeof FLOW_PERMISSIONS];

declare module "fastify" {
  interface FastifyContextConfig {
    flowPermission?: FlowPermission;
  }
}

/**
 * Exporta o contrato de configuração usado pelas rotas para declarar uma
 * permissão de flow sem espalhar strings livres pelo bootstrap do servidor.
 */
export interface FlowRouteConfig {
  flowPermission: FlowPermission;
}

/**
 * Indica se a rota recebeu uma permissão de flow válida e pode consultar a
 * política específica do executor interno.
 */
export function isFlowRouteConfig(
  config: unknown,
): config is FlowRouteConfig {
  if (!config || typeof config !== "object") return false;
  const flowPermission = (config as { flowPermission?: unknown }).flowPermission;
  return (
    typeof flowPermission === "string" &&
    Object.values(FLOW_PERMISSIONS).includes(
      flowPermission as FlowPermission,
    )
  );
}

/**
 * Combina o marcador produzido pela autenticação com a configuração efetiva
 * da rota. Sem os três requisitos, o token interno não recebe autorização.
 */
export function canUseFlowRoute(
  claims: AuthClaims | undefined,
  isInternalFlow: boolean | undefined,
  config: unknown,
): boolean {
  return (
    isInternalFlow === true &&
    isFlowRouteConfig(config) &&
    hasFlowPermission(claims, config.flowPermission)
  );
}
