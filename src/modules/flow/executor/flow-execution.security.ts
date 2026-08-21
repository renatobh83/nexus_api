export const FLOW_RUNTIME_STEPS_KEY = "__flowRuntimeSteps";
export const DEFAULT_MAX_FLOW_NODE_DEPTH = 100;
export const DEFAULT_MAX_FLOW_NODE_STEPS = 1000;

export interface FlowExecutionLimits {
  maxDepth: number;
  maxSteps: number;
}

export interface FlowExecutionState {
  steps: number;
}

export class FlowExecutionLimitError extends Error {
  readonly code = "FLOW_EXECUTION_LIMIT";

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, FlowExecutionLimitError.prototype);
  }
}

/**
 * Lê os limites configuráveis do ambiente e aplica defaults seguros quando a
 * configuração estiver ausente, inválida ou fora do intervalo permitido.
 */
export function getFlowExecutionLimits(
  environment: NodeJS.ProcessEnv = process.env,
): FlowExecutionLimits {
  return {
    maxDepth: readPositiveLimit(
      environment.FLOW_MAX_NODE_DEPTH,
      DEFAULT_MAX_FLOW_NODE_DEPTH,
    ),
    maxSteps: readPositiveLimit(
      environment.FLOW_MAX_NODE_STEPS,
      DEFAULT_MAX_FLOW_NODE_STEPS,
    ),
  };
}

/**
 * Cria o estado de uma execução e recupera a contagem persistida quando um
 * flow foi retomado depois de um nó de espera.
 */
export function createFlowExecutionState(
  context?: unknown,
): FlowExecutionState {
  if (!isRecord(context)) return { steps: 0 };

  const persistedSteps = context[FLOW_RUNTIME_STEPS_KEY];
  return Number.isSafeInteger(persistedSteps) && persistedSteps >= 0
    ? { steps: persistedSteps }
    : { steps: 0 };
}

/**
 * Consome uma unidade do orçamento de execução e rejeita ciclos ou grafos
 * excessivamente longos antes que a recursão cause crescimento ilimitado.
 */
export function consumeFlowExecutionStep(
  state: FlowExecutionState,
  nodeId: string,
  depth: number,
  limits: FlowExecutionLimits,
): void {
  if (depth > limits.maxDepth) {
    throw new FlowExecutionLimitError(
      `Profundidade máxima do flow excedida no node ${nodeId}`,
    );
  }

  if (state.steps >= limits.maxSteps) {
    throw new FlowExecutionLimitError(
      `Quantidade máxima de nodes excedida no node ${nodeId}`,
    );
  }

  state.steps += 1;
}

/**
 * Remove o marcador interno antes de entregar o contexto a um node, mantendo
 * o contrato funcional do contexto que os nodes já recebem atualmente.
 */
export function removeFlowRuntimeMetadata(
  context: Record<string, any>,
): Record<string, any> {
  const cleanContext = { ...context };
  delete cleanContext[FLOW_RUNTIME_STEPS_KEY];
  return cleanContext;
}

/**
 * Persiste somente a contagem necessária para que uma retomada continue sob o
 * mesmo limite total, sem expor estado de controle para os nodes do flow.
 */
export function persistFlowRuntimeMetadata(
  context: Record<string, any>,
  state: FlowExecutionState,
): Record<string, any> {
  return {
    ...removeFlowRuntimeMetadata(context),
    [FLOW_RUNTIME_STEPS_KEY]: state.steps,
  };
}

/**
 * Converte uma variável de ambiente em limite inteiro positivo e impede valores
 * extremos que poderiam desabilitar a proteção por configuração acidental.
 */
function readPositiveLimit(
  value: string | undefined,
  fallback: number,
): number {
  if (!value) return fallback;

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 100_000
    ? parsed
    : fallback;
}

/**
 * Faz narrowing do contexto persistido sem aceitar arrays ou valores nulos como
 * objetos de execução.
 */
function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
