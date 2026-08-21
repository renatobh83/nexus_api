const HTTP_PROTOCOLS = new Set(["http:", "https:"]);

export function getMediaBaseUrl(fallbackOrigin?: string): string {
  const configuredOrigin =
    process.env.MEDIA_URL?.trim() || fallbackOrigin?.trim();

  if (!configuredOrigin) {
    throw new Error("MEDIA_URL não configurado");
  }

  let parsedOrigin: URL;
  try {
    parsedOrigin = new URL(configuredOrigin);
  } catch {
    throw new Error("MEDIA_URL deve ser uma URL HTTP ou HTTPS válida");
  }

  if (!HTTP_PROTOCOLS.has(parsedOrigin.protocol)) {
    throw new Error("MEDIA_URL deve usar HTTP ou HTTPS");
  }

  if (
    parsedOrigin.pathname !== "/" ||
    parsedOrigin.search ||
    parsedOrigin.hash
  ) {
    throw new Error(
      "MEDIA_URL deve conter somente a origem, sem `/public`, caminho, query ou hash",
    );
  }

  return parsedOrigin.toString().replace(/\/+$/, "");
}

export function buildPublicMediaUrl(
  filename: string,
  mediaBaseUrl: string,
): string {
  const safeFilename = filename.trim();

  if (
    !safeFilename ||
    safeFilename.includes("/") ||
    safeFilename.includes("\\")
  ) {
    throw new Error("Nome de mídia inválido");
  }

  return `${mediaBaseUrl}/public/${encodeURIComponent(safeFilename)}`;
}

/**
 * Centraliza a origem pública das mídias para que o upload do chat web e as
 * mensagens enviadas pela aplicação interna produzam o mesmo contrato.
 *
 * `MEDIA_URL` deve apontar para a origem HTTP/HTTPS do backend, por exemplo:
 * `http://192.168.1.68:3000`. O fallback existe apenas para o upload HTTP,
 * permitindo funcionamento local quando a variável ainda não foi configurada.
 */
