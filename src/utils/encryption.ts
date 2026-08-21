import crypto from "crypto";

const GCM_ALGORITHM = "aes-256-gcm";
const CBC_ALGORITHM = "aes-256-cbc";
const GCM_VERSION = "v2";
const GCM_IV_LENGTH = 12;
const GCM_AUTH_TAG_LENGTH = 16;
const CBC_IV_LENGTH = 16;

/**
 * Lê e valida a chave hexadecimal de 256 bits usada pelas duas versões do
 * formato. A validação ocorre no uso para permitir que o módulo seja importado
 * durante comandos de diagnóstico sem mascarar a configuração ausente.
 */
function getEncryptionKey(): Buffer {
  const configuredKey = process.env.ENCRYPTION_KEY?.trim();

  if (!configuredKey || !/^[0-9a-f]{64}$/i.test(configuredKey)) {
    throw new Error(
      "ENCRYPTION_KEY deve conter exatamente 64 caracteres hexadecimais (32 bytes).",
    );
  }

  return Buffer.from(configuredKey, "hex");
}

/**
 * Converte um campo hexadecimal do payload em buffer e valida seu tamanho,
 * evitando que entradas truncadas ou com caracteres inválidos cheguem ao
 * OpenSSL e produzam mensagens de erro inconsistentes.
 */
function decodeHex(value: string, expectedBytes: number, fieldName: string) {
  if (value.length !== expectedBytes * 2 || !/^[0-9a-f]+$/i.test(value)) {
    throw new Error(`Campo ${fieldName} inválido no texto criptografado.`);
  }

  return Buffer.from(value, "hex");
}

/** Valida ciphertexts hexadecimais variáveis e permite vazio apenas quando solicitado. */
function decodeVariableHex(
  value: string,
  fieldName: string,
  allowEmpty = false,
) {
  if (
    (!allowEmpty && value.length === 0) ||
    value.length % 2 !== 0 ||
    (value.length > 0 && !/^[0-9a-f]+$/i.test(value))
  ) {
    throw new Error(`Campo ${fieldName} inválido no texto criptografado.`);
  }

  return Buffer.from(value, "hex");
}

/**
 * Criptografa uma string com AES-256-GCM e autenticação integrada. O prefixo
 * `v2` identifica o novo formato `v2:iv:authTag:ciphertext` e permite que
 * dados antigos continuem sendo lidos sem serem regravados automaticamente.
 */
export const encrypt = (text: string): string => {
  const iv = crypto.randomBytes(GCM_IV_LENGTH);
  const cipher = crypto.createCipheriv(GCM_ALGORITHM, getEncryptionKey(), iv, {
    authTagLength: GCM_AUTH_TAG_LENGTH,
  });
  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    GCM_VERSION,
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
};

/**
 * Descriptografa o formato GCM atual e o formato CBC legado. O formato legado
 * é aceito somente para leitura; toda nova chamada de `encrypt` produz GCM.
 * Falhas de autenticação ou corrupção do payload são relançadas para que o
 * chamador possa tratá-las, em vez de receber a string ambígua `"null"`.
 */
export const decrypt = (text: string): string => {
  const parts = String(text ?? "").split(":");

  if (parts[0] === GCM_VERSION) {
    return decryptGcm(parts);
  }

  return decryptLegacyCbc(parts);
};

/** Descriptografa o formato autenticado `v2:iv:authTag:ciphertext`. */
function decryptGcm(parts: string[]): string {
  if (parts.length !== 4) {
    throw new Error("Formato GCM criptografado inválido.");
  }

  const iv = decodeHex(parts[1], GCM_IV_LENGTH, "IV");
  const authTag = decodeHex(parts[2], GCM_AUTH_TAG_LENGTH, "authTag");
  const encryptedText = decodeVariableHex(parts[3], "ciphertext", true);
  const decipher = crypto.createDecipheriv(
    GCM_ALGORITHM,
    getEncryptionKey(),
    iv,
    { authTagLength: GCM_AUTH_TAG_LENGTH },
  );

  decipher.setAuthTag(authTag);
  return Buffer.concat([
    decipher.update(encryptedText),
    decipher.final(),
  ]).toString("utf8");
}

/** Descriptografa o formato legado sem autenticação `iv:ciphertext`. */
function decryptLegacyCbc(parts: string[]): string {
  if (parts.length !== 2) {
    throw new Error("Formato CBC legado criptografado inválido.");
  }

  const iv = decodeHex(parts[0], CBC_IV_LENGTH, "IV legado");
  const encryptedText = decodeVariableHex(parts[1], "ciphertext legado");
  const decipher = crypto.createDecipheriv(
    CBC_ALGORITHM,
    getEncryptionKey(),
    iv,
  );

  return Buffer.concat([
    decipher.update(encryptedText),
    decipher.final(),
  ]).toString("utf8");
}
