export const MAX_REGISTRATION_TOKEN_LENGTH = 4_096;
const MAX_NAME_LENGTH = 150;
const MAX_EMAIL_LENGTH = 254;
const MAX_CPF_LENGTH = 11;
const MAX_BIRTH_DATE_LENGTH = 10;

export type RegistrationForm = {
  ds_paciente: string;
  ds_email: string;
  ds_cpf: string;
  dt_nascimento: string;
};

/** Aceita somente códigos curtos com caracteres seguros para compor a chave Redis. */
export function isValidShortCode(code: unknown): code is string {
  return typeof code === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(code);
}

/** Permite redirecionar apenas para destinos HTTP(S) absolutos e não para esquemas executáveis. */
export function isSafeRedirectTarget(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2_048) return false;

  try {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

/** Verifica se o valor recebido pode ser tratado como um objeto JSON simples. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Valida e normaliza os únicos campos aceitos pelo cadastro público do Genesis. */
export function parseRegistrationForm(
  value: unknown,
): RegistrationForm | undefined {
  if (!isRecord(value)) return undefined;

  const name =
    typeof value.ds_paciente === "string" ? value.ds_paciente.trim() : "";
  const email = typeof value.ds_email === "string" ? value.ds_email.trim() : "";
  const cpf = typeof value.ds_cpf === "string" ? value.ds_cpf.trim() : "";
  const birthDate =
    typeof value.dt_nascimento === "string" ? value.dt_nascimento.trim() : "";

  if (
    !name ||
    name.length > MAX_NAME_LENGTH ||
    name.includes("\0") ||
    !email ||
    email.length > MAX_EMAIL_LENGTH ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    cpf.length > MAX_CPF_LENGTH ||
    !/^\d{11}$/.test(cpf) ||
    birthDate.length > MAX_BIRTH_DATE_LENGTH ||
    !/^\d{2}\/\d{2}\/\d{4}$/.test(birthDate)
  ) {
    return undefined;
  }

  return {
    ds_paciente: name,
    ds_email: email,
    ds_cpf: cpf,
    dt_nascimento: birthDate,
  };
}
