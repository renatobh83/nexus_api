import type { Multipart, MultipartFile } from "@fastify/multipart";
import { AppError } from "./AppError.js";

export const MAX_MULTIPART_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_MULTIPART_TOTAL_BYTES = 60 * 1024 * 1024;
export const MAX_MULTIPART_FILES = 5;

export interface BufferedMultipartFile {
  filename: string;
  mimetype: string;
  buffer: Buffer;
}

export interface ParsedMultipartParts {
  files: BufferedMultipartFile[];
  fields: Record<string, unknown>;
}

/**
 * Lê um arquivo multipart em chunks e interrompe a operação assim que o
 * limite recebido é ultrapassado, evitando usar `toBuffer()` sem controle.
 */
async function readLimitedFile(
  file: MultipartFile,
  maxBytes: number,
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of file.file) {
    const chunkBuffer = Buffer.isBuffer(chunk)
      ? chunk
      : Buffer.from(chunk as Uint8Array);
    totalBytes += chunkBuffer.length;

    if (totalBytes > maxBytes) {
      file.file.resume();
      throw new AppError("Arquivo excede o limite permitido", 413);
    }

    chunks.push(chunkBuffer);
  }

  if (file.file.truncated) {
    throw new AppError("Arquivo excede o limite permitido", 413);
  }

  if (totalBytes === 0) {
    throw new AppError("Arquivo vazio não é permitido", 400);
  }

  return Buffer.concat(chunks, totalBytes);
}

/**
 * Processa as partes multipart com limites por operação e mantém o contrato
 * atual dos controllers: campos separados e arquivos já disponíveis como
 * `{ filename, mimetype, buffer }` para os dispatchers existentes.
 */
export async function readMultipartParts(
  parts: AsyncIterableIterator<Multipart>,
): Promise<ParsedMultipartParts> {
  const files: BufferedMultipartFile[] = [];
  const fields: Record<string, unknown> = {};
  let totalBytes = 0;

  for await (const part of parts) {
    if (part.type !== "file") {
      if (part.valueTruncated) {
        throw new AppError("Campo multipart excede o limite permitido", 413);
      }

      fields[part.fieldname] = part.value;
      continue;
    }

    if (files.length >= MAX_MULTIPART_FILES) {
      part.file.resume();
      throw new AppError(
        `O limite de ${MAX_MULTIPART_FILES} arquivos por operação foi excedido`,
        413,
      );
    }

    const remainingBytes = MAX_MULTIPART_TOTAL_BYTES - totalBytes;
    if (remainingBytes <= 0) {
      part.file.resume();
      throw new AppError("O tamanho total dos arquivos foi excedido", 413);
    }

    const buffer = await readLimitedFile(
      part,
      Math.min(MAX_MULTIPART_FILE_BYTES, remainingBytes),
    );
    totalBytes += buffer.length;

    files.push({
      filename: part.filename,
      mimetype: part.mimetype,
      buffer,
    });
  }

  return { files, fields };
}
