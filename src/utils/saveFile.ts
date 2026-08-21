import { createWriteStream } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

const MAX_CHAT_IMAGE_BYTES = 10 * 1024 * 1024;

const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/bmp": ".bmp",
};

function getImageExtension(mimetype: string): string {
  const extension = IMAGE_EXTENSIONS[mimetype.toLowerCase()];

  if (!extension) {
    throw new Error("Tipo de imagem não permitido");
  }

  return extension;
}

function generateFileName(mimetype: string): string {
  return `${randomUUID()}${getImageExtension(mimetype)}`;
}

export async function saveFile(file: any, folder: string): Promise<string> {
  if (!file?.file || typeof file.file.pipe !== "function") {
    throw new Error("Arquivo multipart inválido");
  }

  const mimetype = String(file.mimetype || "").toLowerCase();
  const filename = generateFileName(mimetype);
  const filePath = path.join(folder, filename);

  await mkdir(folder, { recursive: true });

  let totalBytes = 0;
  const sizeLimiter = new Transform({
    transform(chunk, _encoding, callback) {
      totalBytes += chunk.length;

      if (totalBytes > MAX_CHAT_IMAGE_BYTES) {
        callback(new Error("Imagem excede o limite de 10 MB"));
        return;
      }

      callback(null, chunk);
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

export async function saveBufferedImage(
  file: { buffer?: Buffer; mimetype?: string },
  folder: string,
): Promise<string> {
  if (!file?.buffer || !Buffer.isBuffer(file.buffer)) {
    throw new Error("Buffer de imagem inválido");
  }

  const mimetype = String(file.mimetype || "").toLowerCase();
  const extension = getImageExtension(mimetype);

  if (file.buffer.length === 0 || file.buffer.length > MAX_CHAT_IMAGE_BYTES) {
    throw new Error("Imagem vazia ou maior que 10 MB");
  }

  const filename = `${randomUUID()}${extension}`;
  const filePath = path.join(folder, filename);

  await mkdir(folder, { recursive: true });
  await writeFile(filePath, file.buffer, { flag: "wx" });

  return filename;
}

/**
 * Persiste um buffer de imagem já recebido pela aplicação interna.
 * O nome original nunca é utilizado no caminho público; o arquivo recebe um
 * UUID e é salvo no mesmo diretório usado pelo servidor estático.
 */

/**
 * Persiste somente imagens recebidas pelo multipart do chat web.
 *
 * O nome original do upload não é reutilizado: um UUID reduz colisões,
 * impede traversal por nome de arquivo e evita que nomes controlados pelo
 * cliente sejam usados diretamente no caminho público. O limite específico
 * do chat é menor que o limite multipart global da API para reduzir abuso de
 * memória, armazenamento e tráfego.
 */
