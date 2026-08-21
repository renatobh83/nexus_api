const DEFAULT_MAX_RESPONSE_BYTES = 10 * 1024 * 1024;
const MAX_ALLOWED_RESPONSE_BYTES = 50 * 1024 * 1024;

const PRIVATE_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "0.0.0.0",
  "::1",
]);

export type ExternalBaseUrlOptions = {
  allowPrivateNetworks?: boolean;
  allowedHosts?: readonly string[];
};

export function normalizeExternalBaseUrl(
  value: unknown,
  options: ExternalBaseUrlOptions = {},
): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("URL base da integração externa inválida");
  }

  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("URL base da integração externa inválida");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("A URL base deve usar HTTP ou HTTPS");
  }
  if (url.username || url.password || url.hash || url.search) {
    throw new Error(
      "A URL base não pode conter credenciais, query ou fragmento",
    );
  }

  const hostname = normalizeHostname(url.hostname);
  const allowedHosts = (options.allowedHosts ?? [])
    .map((host) => normalizeHostname(host))
    .filter(Boolean);
  const hostIsAllowed = allowedHosts.some(
    (allowedHost) =>
      hostname === allowedHost || hostname.endsWith(`.${allowedHost}`),
  );

  if (allowedHosts.length > 0 && !hostIsAllowed) {
    throw new Error("Host da integração externa não está na allowlist");
  }

  if (
    isPrivateNetworkHost(hostname) &&
    !options.allowPrivateNetworks &&
    !hostIsAllowed
  ) {
    throw new Error(
      "Destino de rede privada bloqueado; use allowlist explícita para habilitá-lo",
    );
  }

  url.pathname = url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`;
  return url.toString();
}

export function normalizeMaxResponseBytes(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_MAX_RESPONSE_BYTES;
  }

  return Math.min(Math.floor(parsed), MAX_ALLOWED_RESPONSE_BYTES);
}

export function parseAllowedHosts(value: unknown): string[] {
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean);
}

export async function readResponseBodyWithLimit(
  response: Response,
  maxBytes: number,
  operation: string,
): Promise<Uint8Array> {
  assertContentLength(response, maxBytes, operation);

  if (!response.body) {
    const body = new Uint8Array(await response.arrayBuffer());
    assertByteLength(body.byteLength, maxBytes, operation);
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
        throw new Error(
          `[${operation}] corpo da resposta excede o limite de ${maxBytes} bytes`,
        );
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

export function limitResponseStream(
  response: Response,
  maxBytes: number,
  operation: string,
): ReadableStream<Uint8Array> | null {
  assertContentLength(response, maxBytes, operation);
  if (!response.body) return null;

  let totalBytes = 0;
  return response.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        totalBytes += chunk.byteLength;
        if (totalBytes > maxBytes) {
          controller.error(
            new Error(
              `[${operation}] corpo da resposta excede o limite de ${maxBytes} bytes`,
            ),
          );
          return;
        }
        controller.enqueue(chunk);
      },
    }),
  );
}

function assertContentLength(
  response: Response,
  maxBytes: number,
  operation: string,
): void {
  const contentLength = response.headers.get("content-length");
  if (!contentLength) return;

  const parsed = Number(contentLength);
  if (Number.isFinite(parsed) && parsed > maxBytes) {
    throw new Error(
      `[${operation}] corpo da resposta excede o limite de ${maxBytes} bytes`,
    );
  }
}

function assertByteLength(
  byteLength: number,
  maxBytes: number,
  operation: string,
): void {
  if (byteLength > maxBytes) {
    throw new Error(
      `[${operation}] corpo da resposta excede o limite de ${maxBytes} bytes`,
    );
  }
}

function normalizeHostname(hostname: string): string {
  return hostname
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, "");
}

function isPrivateNetworkHost(hostname: string): boolean {
  if (PRIVATE_HOSTNAMES.has(hostname)) return true;
  if (hostname.endsWith(".localhost")) return true;

  const octets = hostname.split(".").map(Number);
  if (
    octets.length !== 4 ||
    octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
  ) {
    return (
      hostname.includes(":") &&
      (hostname === "::1" || hostname.startsWith("fc"))
    );
  }

  const [first, second] = octets;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

/**
 * A política separa validação da URL, limites de bytes e stream limitado para
 * que o cliente possa testar cada fronteira sem fazer chamadas reais.
 */
