import path from "node:path";

export const MAX_CHAT_IMAGE_BYTES = 10 * 1024 * 1024;
export const IMAGE_SIGNATURE_BYTES = 12;

const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/bmp": ".bmp",
};

const IMAGE_ALLOWED_EXTENSIONS: Record<string, string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/gif": [".gif"],
  "image/webp": [".webp"],
  "image/bmp": [".bmp"],
};

/**
 * Retorna a extensão controlada pelo servidor para um MIME de imagem permitido.
 */
export function getImageExtension(mimetype: string): string {
  const extension = IMAGE_EXTENSIONS[mimetype.toLowerCase()];

  if (!extension) {
    throw new Error("Tipo de imagem não permitido");
  }

  return extension;
}

/**
 * Valida o MIME informado e, quando disponível, exige que a extensão original
 * seja compatível com ele. O nome original nunca é usado no caminho persistido.
 */
export function validateImageUploadMetadata(
  mimetype: unknown,
  filename?: unknown,
): string {
  if (typeof mimetype !== "string") {
    throw new Error("Tipo de imagem não permitido");
  }

  const normalizedMime = mimetype.trim().toLowerCase();
  const extension = getImageExtension(normalizedMime);

  if (filename !== undefined) {
    if (typeof filename !== "string") {
      throw new Error("Extensão de imagem não permitida");
    }

    const originalExtension = path.extname(filename.trim()).toLowerCase();
    const allowedExtensions = IMAGE_ALLOWED_EXTENSIONS[normalizedMime] ?? [];

    // O widget usa "imagem" como fallback quando não há nome original. Nesse
    // caso, a extensão é ausente e o servidor continua controlando a final.
    if (originalExtension && !allowedExtensions.includes(originalExtension)) {
      throw new Error("Extensão de imagem não permitida");
    }
  }

  return extension;
}

/**
 * Confere os bytes iniciais do arquivo contra a assinatura do formato declarado,
 * impedindo que conteúdo arbitrário seja salvo apenas por informar `image/*`.
 */
export function hasValidImageSignature(
  mimetype: string,
  data: Buffer,
): boolean {
  const normalizedMime = mimetype.trim().toLowerCase();

  if (normalizedMime === "image/jpeg") {
    return (
      data.length >= 3 &&
      data.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
    );
  }

  if (normalizedMime === "image/png") {
    return (
      data.length >= 8 &&
      data
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    );
  }

  if (normalizedMime === "image/gif") {
    return (
      data.subarray(0, 6).toString("ascii") === "GIF87a" ||
      data.subarray(0, 6).toString("ascii") === "GIF89a"
    );
  }

  if (normalizedMime === "image/webp") {
    return (
      data.length >= 12 &&
      data.subarray(0, 4).toString("ascii") === "RIFF" &&
      data.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }

  if (normalizedMime === "image/bmp") {
    return data.length >= 2 && data.subarray(0, 2).toString("ascii") === "BM";
  }

  return false;
}

/**
 * Valida um buffer completo antes da gravação usada pela aplicação interna.
 */
export function validateImageBuffer(
  mimetype: unknown,
  buffer: unknown,
): asserts buffer is Buffer {
  validateImageUploadMetadata(mimetype);

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error("Imagem vazia ou buffer inválido");
  }

  if (!hasValidImageSignature(String(mimetype), buffer)) {
    throw new Error("Conteúdo de imagem não corresponde ao MIME informado");
  }
}
