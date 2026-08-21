import { createWriteStream } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  IMAGE_SIGNATURE_BYTES,
  MAX_CHAT_IMAGE_BYTES,
  hasValidImageSignature,
  validateImageBuffer,
  validateImageUploadMetadata,
} from "./imageUpload.security.js";

/**
 * Gera um nome público imprevisível usando somente uma extensão definida pelo
 * servidor após a validação do MIME e da assinatura do arquivo.
 */
function generateFileName(extension: string): string {
  return `${randomUUID()}${extension}`;
}

/**
 * Persiste uma imagem multipart em arquivo temporário controlado, validando o
 * nome original, o tamanho e a assinatura binária antes de concluir a operação.
 */
export async function saveFile(file: any, folder: string): Promise<string> {
  if (!file?.file || typeof file.file.pipe !== "function") {
    throw new Error("Arquivo multipart inválido");
  }

  const extension = validateImageUploadMetadata(file.mimetype, file.filename);
  const mimetype = String(file.mimetype).trim().toLowerCase();
  const filename = generateFileName(extension);
  const filePath = path.join(folder, filename);

  await mkdir(folder, { recursive: true });

  let totalBytes = 0;
  const signatureChunks: Buffer[] = [];
  let signatureBytes = 0;
  const sizeLimiter = new Transform({
    transform(chunk, _encoding, callback) {
      const chunkBuffer = Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(chunk as Uint8Array);
      totalBytes += chunkBuffer.length;

      if (totalBytes > MAX_CHAT_IMAGE_BYTES) {
        callback(new Error("Imagem excede o limite de 10 MB"));
        return;
      }

      if (signatureBytes < IMAGE_SIGNATURE_BYTES) {
        const bytesToCapture = Math.min(
          IMAGE_SIGNATURE_BYTES - signatureBytes,
          chunkBuffer.length,
        );
        signatureChunks.push(chunkBuffer.subarray(0, bytesToCapture));
        signatureBytes += bytesToCapture;
      }

      callback(null, chunkBuffer);
    },
    flush(callback) {
      const signature = Buffer.concat(signatureChunks, signatureBytes);
      if (!hasValidImageSignature(mimetype, signature)) {
        callback(
          new Error("Conteúdo de imagem não corresponde ao MIME informado"),
        );
        return;
      }

      callback();
    },
  });

  try {
    await pipeline(
      file.file,
      sizeLimiter,
      createWriteStream(filePath, { flags: "wx" }),
    );
  } catch (error) {
    await rm(filePath, { force: true });
    throw error;
  }

  return filename;
}

/**
 * Persiste um buffer de imagem já recebido pela aplicação interna.
 * O nome original nunca é utilizado no caminho público; o arquivo recebe um
 * UUID e é salvo no mesmo diretório usado pelo servidor estático.
 */
export async function saveBufferedImage(
  file: { buffer?: Buffer; mimetype?: string },
  folder: string,
): Promise<string> {
  validateImageBuffer(file?.mimetype, file?.buffer);
  const extension = validateImageUploadMetadata(file.mimetype);

  if (file.buffer.length > MAX_CHAT_IMAGE_BYTES) {
    throw new Error("Imagem vazia ou maior que 10 MB");
  }

  const filename = `${randomUUID()}${extension}`;
  const filePath = path.join(folder, filename);

  await mkdir(folder, { recursive: true });
  await writeFile(filePath, file.buffer, { flag: "wx" });

  return filename;
}
