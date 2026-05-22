import path from "path";
import fs from "fs";

function generateFileName(originalname: string) {
  const ext = path.extname(originalname);
  const name = path.basename(originalname, ext);
  return `${name}${ext}`;
}

export async function saveFile(file: any, folder: string): Promise<string> {
  const filename = generateFileName(file.filename || file.file?.name || "file");

  const filePath = path.join(folder, filename);
  const writeStream = fs.createWriteStream(filePath);
  await file.file.pipe(writeStream); // `file.file` é o ReadableStream
  await new Promise<void>((resolve, reject) => {
    writeStream.on("finish", () => resolve()); // <-- wrapper
    writeStream.on("error", (err) => reject(err));
  });

  return filename;
}
