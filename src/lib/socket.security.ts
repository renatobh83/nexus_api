const DEFAULT_SOCKET_MAX_HTTP_BUFFER_SIZE = 1_000_000;
const MAX_SOCKET_MAX_HTTP_BUFFER_SIZE = 10_000_000;

export const parseSocketMaxHttpBufferSize = (value: unknown): number => {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return DEFAULT_SOCKET_MAX_HTTP_BUFFER_SIZE;
  }

  return Math.min(parsed, MAX_SOCKET_MAX_HTTP_BUFFER_SIZE);
};

/**
 * Normaliza a configuração para impedir payloads Socket.IO ilimitados ou
 * valores inválidos de ambiente. O teto evita que uma configuração acidental
 * reabra o risco de exaustão de memória.
 */

export const getSocketMaxHttpBufferSize = (): number =>
  parseSocketMaxHttpBufferSize(process.env.SOCKET_MAX_HTTP_BUFFER_SIZE);

/**
 * O valor padrão de 1 MB é suficiente para eventos de atendimento e mantém
 * uploads de mídia no endpoint HTTP específico, que possui limites próprios.
 */

export const SOCKET_MAX_HTTP_BUFFER_SIZE_LIMITS = {
  default: DEFAULT_SOCKET_MAX_HTTP_BUFFER_SIZE,
  maximum: MAX_SOCKET_MAX_HTTP_BUFFER_SIZE,
} as const;

/**
 * Os limites exportados permitem testar a política sem inicializar o servidor
 * ou depender de variáveis de ambiente no processo de teste.
 */
