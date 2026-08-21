const ALLOWED_HTTP_METHODS = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
]);

export const FLOW_HTTP_LIMITS = {
  defaultTimeoutMs: 15_000,
  maxTimeoutMs: 60_000,
  defaultMaxRequestBytes: 1_048_576,
  maxRequestBytes: 5_242_880,
  defaultMaxResponseBytes: 1_048_576,
  maxResponseBytes: 10_485_760,
} as const;

export interface FlowHttpLimits {
  timeoutMs: number;
  maxRequestBytes: number;
  maxResponseBytes: number;
}

export class FlowHttpRequestLimitError extends Error {
  readonly code = "FLOW_HTTP_REQUEST_LIMIT";

  constructor() {
    super("O corpo enviado pelo node HTTP excede o limite configurado");
    Object.setPrototypeOf(this, FlowHttpRequestLimitError.prototype);
  }
}

export class FlowHttpResponseLimitError extends Error {
  readonly code = "FLOW_HTTP_RESPONSE_LIMIT";

  constructor() {
    super("A resposta do node HTTP excede o limite configurado");
    Object.setPrototypeOf(this, FlowHttpResponseLimitError.prototype);
  }
}

export class FlowHttpResponseParseError extends Error {
  readonly code = "FLOW_HTTP_RESPONSE_INVALID";

  constructor() {
    super("A resposta JSON do node HTTP é inválida");
    Object.setPrototypeOf(this, FlowHttpResponseParseError.prototype);
  }
}

/**
 * Lê timeout e limite de resposta do ambiente, sempre dentro de intervalos
 * seguros para impedir chamadas ou buffers ilimitados por configuração acidental.
 */
export function getFlowHttpLimits(
  environment: NodeJS.ProcessEnv = process.env,
): FlowHttpLimits {
  return {
    timeoutMs: readBoundedPositiveInteger(
      environment.FLOW_HTTP_TIMEOUT_MS,
      FLOW_HTTP_LIMITS.defaultTimeoutMs,
      FLOW_HTTP_LIMITS.maxTimeoutMs,
    ),
    maxRequestBytes: readBoundedPositiveInteger(
      environment.FLOW_HTTP_MAX_REQUEST_BYTES,
      FLOW_HTTP_LIMITS.defaultMaxRequestBytes,
      FLOW_HTTP_LIMITS.maxRequestBytes,
    ),
    maxResponseBytes: readBoundedPositiveInteger(
      environment.FLOW_HTTP_MAX_RESPONSE_BYTES,
      FLOW_HTTP_LIMITS.defaultMaxResponseBytes,
      FLOW_HTTP_LIMITS.maxResponseBytes,
    ),
  };
}

/**
 * Aceita somente verbos HTTP usados pelo node e evita que um valor arbitrário
 * seja encaminhado ao dispatcher do runtime.
 */
export function normalizeFlowHttpMethod(value: unknown): string {
  const method = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (!ALLOWED_HTTP_METHODS.has(method)) {
    throw new Error("Método HTTP do flow inválido");
  }
  return method;
}

/**
 * Exige o token interno antes da chamada, evitando enviar a string literal
 * `Bearer undefined` quando a credencial não foi configurada no ambiente.
 */
export function getFlowServiceToken(
  environment: NodeJS.ProcessEnv = process.env,
): string {
  const token = environment.FLOW_SERVICE_TOKEN?.trim();
  if (!token) {
    throw new Error("FLOW_SERVICE_TOKEN não configurado para o node HTTP");
  }
  return token;
}

/**
 * Serializa o body uma única vez e rejeita payloads maiores que o limite do
 * node antes de abrir a conexão externa.
 */
export function serializeFlowHttpBody(
  body: unknown,
  maxBytes: number,
): string {
  const serialized = JSON.stringify(body);
  if (serialized === undefined) {
    throw new FlowHttpRequestLimitError();
  }

  if (new TextEncoder().encode(serialized).byteLength > maxBytes) {
    throw new FlowHttpRequestLimitError();
  }
  return serialized;
}

/**
 * Valida a URL-base confiável do backend sem permitir credenciais, query ou
 * fragmento na configuração que será usada para montar o destino final.
 */
export function normalizeFlowHttpBaseUrl(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("BACKEND_URL não configurada para o node HTTP");
  }

  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("BACKEND_URL inválida para o node HTTP");
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error("BACKEND_URL deve usar HTTP ou HTTPS");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("BACKEND_URL não pode conter credenciais, query ou fragmento");
  }

  url.pathname = url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`;
  return url.toString();
}

/**
 * Mantém o destino do node relativo à BACKEND_URL, rejeitando esquemas e
 * autoridades fornecidos dentro do flow persistido.
 */
export function normalizeFlowHttpPath(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("URL do node HTTP não configurada");
  }

  const path = value.trim();
  if (
    path.startsWith("//") ||
    path.startsWith("\\\\") ||
    path.includes("\\") ||
    path.split("/").some((segment) => segment === "..") ||
    /^[a-z][a-z\d+.-]*:\/\//i.test(path)
  ) {
    throw new Error("URL do node HTTP deve ser relativa à BACKEND_URL");
  }

  return path.replace(/^\/+/, "");
}

/**
 * Lê o corpo de uma resposta por stream e interrompe a operação antes de
 * acumular mais bytes que o limite definido para o node.
 */
export async function readFlowHttpResponseWithLimit(
  response: Response,
  maxBytes: number,
): Promise<Uint8Array> {
  const contentLength = response.headers.get("content-length");
  if (contentLength) {
    const parsed = Number(contentLength);
    if (Number.isFinite(parsed) && parsed > maxBytes) {
      throw new FlowHttpResponseLimitError();
    }
  }

  if (!response.body) {
    const body = new Uint8Array(await response.arrayBuffer());
    if (body.byteLength > maxBytes) {
      throw new FlowHttpResponseLimitError();
    }
    return body;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = value instanceof Uint8Array ? value : new Uint8Array(value);
      totalBytes += chunk.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new FlowHttpResponseLimitError();
      }
      chunks.push(chunk);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

/**
 * Converte respostas JSON com falha de parse em erro de domínio sem registrar o
 * conteúdo retornado pelo serviço externo.
 */
export function parseFlowHttpResponse(
  body: Uint8Array,
  contentType: string,
): unknown {
  const text = new TextDecoder().decode(body);
  if (!contentType.toLowerCase().includes("application/json")) {
    return text;
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new FlowHttpResponseParseError();
  }
}

/**
 * Normaliza um inteiro positivo de ambiente e aplica fallback/teto deterministas.
 */
function readBoundedPositiveInteger(
  value: string | undefined,
  fallback: number,
  maximum: number,
): number {
  if (!value) return fallback;

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0
    ? Math.min(parsed, maximum)
    : fallback;
}

/**
 * Retorna uma URL resolvida sob a base validada, sem permitir que o path
 * persistido substitua host ou protocolo do backend.
 */
export function buildFlowHttpUrl(baseUrl: unknown, path: unknown): string {
  return new URL(
    normalizeFlowHttpPath(path),
    normalizeFlowHttpBaseUrl(baseUrl),
  ).toString();
}
