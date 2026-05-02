import path from "node:path";
import mime from "mime-types";
import fs from "fs/promises";

export function getSafeExtension(filename: string, mimetype: any) {
  // 1️⃣ tenta extrair da extensão original (ex: ".jpg", ".xlsx")

  const ext = filename ? path.extname(filename) : "";
  if (ext) return ext;

  // 2️⃣ se não tiver, tenta deduzir do mimetype
  const mimeMap = {
    // 🖼️ Imagens
    "image/jpeg": ".jpg",
    "image/pjpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/bmp": ".bmp",
    "image/tiff": ".tiff",
    "image/svg+xml": ".svg",
    "image/x-icon": ".ico",
    "image/heic": ".heic",
    "image/heif": ".heif",

    // 📄 Documentos Office / LibreOffice / PDF
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      ".docx",
    "application/vnd.ms-excel": ".xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      ".xlsx",
    "application/vnd.ms-powerpoint": ".ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      ".pptx",
    "application/vnd.oasis.opendocument.text": ".odt",
    "application/vnd.oasis.opendocument.spreadsheet": ".ods",
    "application/vnd.oasis.opendocument.presentation": ".odp",
    "application/rtf": ".rtf",
    "text/plain": ".txt",
    "text/csv": ".csv",
    "text/html": ".html",
    "text/xml": ".xml",
    "application/xml": ".xml",
    "application/json": ".json",

    // 🎵 Áudios
    "audio/mpeg": ".mp3",
    "audio/mp3": ".mp3",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/webm": ".webm",
    "audio/ogg": ".ogg",
    "audio/x-m4a": ".m4a",
    "audio/mp4": ".m4a",
    "audio/aac": ".aac",
    "audio/flac": ".flac",
    "audio/x-ms-wma": ".wma",
    "audio/amr": ".amr",

    // 🎥 Vídeos
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/ogg": ".ogv",
    "video/3gpp": ".3gp",
    "video/x-msvideo": ".avi",
    "video/x-ms-wmv": ".wmv",
    "video/mpeg": ".mpeg",
    "video/quicktime": ".mov",
    "video/x-flv": ".flv",
    "video/x-matroska": ".mkv",

    // 📦 Compactados / Arquivos de sistema
    "application/zip": ".zip",
    "application/x-zip-compressed": ".zip",
    "application/x-7z-compressed": ".7z",
    "application/x-rar-compressed": ".rar",
    "application/gzip": ".gz",
    "application/x-tar": ".tar",
    "application/x-bzip2": ".bz2",
    "application/octet-stream": ".bin",
  } as any;

  return mimeMap[mimetype] || "";
}

export function buildFilename(msg: any, ext: any) {
  const baseName = msg.fileName || `media-${new Date().getTime()}`;
  // Remove extensão duplicada se já existir no nome original
  const nameWithoutExt = path.basename(baseName, path.extname(baseName));
  const finalName = `${nameWithoutExt}${ext}`;

  return finalName;
}

export async function transformFile(file: {
  path: string;
  filename: string;
  buffer?: Buffer;
}) {
  // Lê o conteúdo do arquivo como Buffer
  const buffer = file.buffer ? file.buffer : await fs.readFile(file.path!);

  // Extrai extensão
  const ext = path.extname(file.filename); // ex: .pdf
  const base = path.basename(file.filename, ext);

  // Cria novo nome do arquivo
  const newFilename = `${sanitizeFilename(base)}`;

  // Detecta mimetype pela extensão
  const mimetype = mime.lookup(ext) || "application/octet-stream";

  return {
    filename: newFilename,
    mimetype,
    buffer,
  };
}

function sanitizeFilename(filename: string): string {
  return filename
    .normalize("NFD") // remove acentos
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "_"); // troca espaços e símbolos por _
}
