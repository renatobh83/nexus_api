import { createWriteStream } from "node:fs";
import sharp from "sharp";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { PassThrough, Transform } from "node:stream";
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
const COMPRESSIBLE_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);
function createOptimizer() {
  return sharp()
    .rotate() // respeita a orientação EXIF antes de remover metadados
    .resize({
      width: 1280,
      height: 1280,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 75 });
}
async function optimizeImage(
  buffer: Buffer,
  mimetype: string,
  extension: string,
) {
  if (!COMPRESSIBLE_MIMES.has(mimetype.trim().toLowerCase())) {
    return { buffer, extension };
  }
  try {
    const out = await sharp(buffer)
      .rotate()
      .resize({
        width: 1280,
        height: 1280,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 75 })
      .toBuffer();
    if (out.length < buffer.length) return { buffer: out, extension: ".webp" };
  } catch {
    // se falhar, mantém o original
  }
  return { buffer, extension };
}
/**
 * Persiste uma imagem multipart em arquivo temporário controlado, validando o
 * nome original, o tamanho e a assinatura binária antes de concluir a operação.
 */
export async function saveFile(file: any, folder: string): Promise<string> {
  console.log("Save imagem in save file");
  if (!file?.file || typeof file.file.pipe !== "function") {
    throw new Error("Arquivo multipart inválido");
  }

  const extension = validateImageUploadMetadata(file.mimetype, file.filename);
  const mimetype = String(file.mimetype).trim().toLowerCase();
  const compress = COMPRESSIBLE_MIMES.has(mimetype);
  const filename = generateFileName(compress ? ".webp" : extension);
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
      compress ? createOptimizer() : new PassThrough(),
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
  console.log("Save imagem in buffer Image");
  validateImageBuffer(file?.mimetype, file?.buffer);
  const extension = validateImageUploadMetadata(file.mimetype);

  if (file.buffer.length > MAX_CHAT_IMAGE_BYTES) {
    throw new Error("Imagem vazia ou maior que 10 MB");
  }

  const optimized = await optimizeImage(file.buffer, file.mimetype!, extension);
  const filename = generateFileName(optimized.extension);
  const filePath = path.join(folder, filename);

  await mkdir(folder, { recursive: true });
  await writeFile(filePath, optimized.buffer, { flag: "wx" });

  return filename;
}
export async function optimizeKeepingFormat(
  buffer: Buffer,
  fileName: string,
): Promise<Buffer> {
  const ext = path.extname(fileName).toLowerCase();
  try {
    let img = sharp(buffer)
      .rotate()
      .resize({
        width: 1280,
        height: 1280,
        fit: "inside",
        withoutEnlargement: true,
      });

    if (ext === ".jpg" || ext === ".jpeg")
      img = img.jpeg({ quality: 75, mozjpeg: true });
    else if (ext === ".png")
      img = img.png({ compressionLevel: 9, palette: true });
    else if (ext === ".webp") img = img.webp({ quality: 75 });
    else return buffer; // áudio, vídeo, documento, gif: não mexe

    const out = await img.toBuffer();
    return out.length < buffer.length ? out : buffer;
  } catch {
    return buffer;
  }
}
