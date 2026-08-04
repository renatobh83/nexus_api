import crypto from "crypto";

// A chave de criptografia DEVE ser uma variável de ambiente de 32 bytes (256 bits)
// Ex: process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString("hex");
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// O IV (Initialization Vector) deve ter 16 bytes para AES-256-CBC
const IV_LENGTH = 16;

// Verifica se a chave de criptografia está definida e tem o tamanho correto
if (!ENCRYPTION_KEY || Buffer.from(ENCRYPTION_KEY, "hex").length !== 32) {
  console.error(
    "ERRO: A variável de ambiente ENCRYPTION_KEY deve ser definida e ter 32 bytes (64 caracteres hexadecimais).",
  );
  // Em um ambiente de produção, você pode querer lançar um erro ou sair do processo
  // throw new Error("ENCRYPTION_KEY não configurada corretamente.");
}

/**
 * Criptografa uma string usando AES-256-CBC.
 * @param {string} text - A string a ser criptografada.
 * @returns {string} A string criptografada no formato "iv:encryptedData" .
 * @throws {Error} Se ENCRYPTION_KEY não estiver definida ou tiver o tamanho incorreto.
 */
export const encrypt = (text: string): string => {
  if (!ENCRYPTION_KEY || Buffer.from(ENCRYPTION_KEY, "hex").length !== 32) {
    throw new Error(
      "ENCRYPTION_KEY não configurada corretamente para criptografia.",
    );
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY, "hex"),
    iv,
  );
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
};

/**
 * Descriptografa uma string usando AES-256-CBC.
 * @param {string} text - A string criptografada no formato "iv:encryptedData".
 * @returns {string} A string descriptografada
 * @throws {Error} Se ENCRYPTION_KEY não estiver definida ou tiver o tamanho incorreto.
 */
export const decrypt = (text: string): string => {
  if (!ENCRYPTION_KEY || Buffer.from(ENCRYPTION_KEY, "hex").length !== 32) {
    throw new Error(
      "ENCRYPTION_KEY não configurada corretamente para descriptografia.",
    );
  }

  try {
    const textParts = text.split(":");
    if (textParts.length !== 2) {
      throw new Error("Formato de texto criptografado inválido.");
    }

    const iv = Buffer.from(textParts.shift() as string, "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(ENCRYPTION_KEY, "hex"),
      iv,
    );
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error: any) {
    console.error("Erro ao descriptografar:", error.message);
    return 'null'; // Ou relance o erro, dependendo da sua política de tratamento de erros
  }
};
