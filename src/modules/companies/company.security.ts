const CNPJ_LENGTH = 14;
const CEP_LENGTH = 8;
const PHONE_MIN_LENGTH = 10;
const PHONE_MAX_LENGTH = 13;
const STATE_LENGTH = 2;
const MAX_TEXT_LENGTH = 160;
const MAX_DESCRIPTION_LENGTH = 500;

interface CompanyOptionalFields {
  tradeName?: string | null;
  description?: string | null;
  email?: string | null;
  phone?: string | null;
  postalCode?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string;
}

interface CompanyRequiredFields {
  cnpj: string;
  legalName: string;
}

export interface CompanyWriteData
  extends CompanyRequiredFields,
    CompanyOptionalFields {}

export type CompanyUpdateData = Partial<
  CompanyRequiredFields & CompanyOptionalFields & { isActive: boolean }
>;

export interface PublicCompany {
  id: string;
  cnpj: string;
  legalName: string;
  tradeName: string | null;
  description: string | null;
  email: string | null;
  phone: string | null;
  postalCode: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  country: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const COMPANY_FIELDS = new Set([
  "cnpj",
  "legalName",
  "tradeName",
  "description",
  "email",
  "phone",
  "postalCode",
  "street",
  "number",
  "complement",
  "neighborhood",
  "city",
  "state",
  "country",
  "isActive",
]);

const hasOwn = (value: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeText = (
  value: unknown,
  maxLength = MAX_TEXT_LENGTH,
): string | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return undefined;

  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) return undefined;
  return normalized;
};

const normalizeOptionalText = (
  value: unknown,
  maxLength = MAX_TEXT_LENGTH,
): string | null | undefined => {
  if (value === null || value === "") return null;
  return normalizeText(value, maxLength);
};

/**
 * Normaliza um CNPJ numérico ou alfanumérico para 14 caracteres maiúsculos.
 * A máscara visual é removida; as 12 primeiras posições aceitam letras e
 * números, enquanto os dois dígitos verificadores finais devem ser numéricos.
 */
export const normalizeCnpj = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;

  const normalized = value
    .trim()
    .toUpperCase()
    .replace(/[.\/\-\s]/g, "");

  return /^[A-Z0-9]{12}[0-9]{2}$/.test(normalized)
    ? normalized
    : undefined;
};

/**
 * Rejeita a sequência artificial composta pelo mesmo caractere nas 12 posições
 * de base. A regra preserva a proteção anterior contra CNPJs numéricos como
 * 11.111.111/1111-11 e também evita aceitar uma base alfanumérica obviamente
 * inválida, sem restringir combinações legítimas de letras e números.
 */
const hasRepeatedBaseCharacters = (value: string): boolean =>
  /^([A-Z0-9])\1{11}$/.test(value.slice(0, 12));

/**
 * Calcula um dígito verificador pelo módulo 11 oficial do CNPJ.
 * Cada caractere da base é convertido pelo código ASCII menos 48: dígitos
 * permanecem com seus valores e A-Z passam a representar 17-42.
 */
const calculateCnpjDigit = (base: string): number => {
  const initialFactor = base.length === 12 ? 5 : 6;
  let factor = initialFactor;
  let total = 0;

  for (const character of base) {
    total += (character.charCodeAt(0) - 48) * factor;
    factor -= 1;
    if (factor === 1) factor = 9;
  }

  const remainder = total % 11;
  return remainder < 2 ? 0 : 11 - remainder;
};

/**
 * Valida CNPJs numéricos legados e CNPJs alfanuméricos novos, aceitando tanto
 * a forma compacta quanto a forma com máscara, como 12.ABC.345/01DE-35.
 */
export const isValidCnpj = (value: unknown): value is string => {
  const normalized = normalizeCnpj(value);
  if (!normalized || hasRepeatedBaseCharacters(normalized)) return false;

  const base = normalized.slice(0, 12);
  const firstDigit = calculateCnpjDigit(base);
  const secondDigit = calculateCnpjDigit(base + firstDigit);
  const checkDigits = `${firstDigit}${secondDigit}`;

  return normalized.slice(12) === checkDigits;
};

const normalizeEmail = (value: unknown): string | undefined => {
  const email = normalizeText(value, 254)?.toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return undefined;
  return email;
};

const normalizePhone = (value: unknown): string | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return undefined;
  const phone = value.replace(/\D/g, "");
  return phone.length >= PHONE_MIN_LENGTH && phone.length <= PHONE_MAX_LENGTH
    ? phone
    : undefined;
};

const normalizePostalCode = (value: unknown): string | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return undefined;
  const postalCode = value.replace(/\D/g, "");
  return postalCode.length === CEP_LENGTH ? postalCode : undefined;
};

const normalizeState = (value: unknown): string | undefined => {
  const state = normalizeText(value, STATE_LENGTH)?.toUpperCase();
  return state && /^[A-Z]{2}$/.test(state) ? state : undefined;
};

const normalizeCountry = (value: unknown): string | undefined =>
  normalizeText(value, 80);

const rejectUnknownFields = (body: Record<string, unknown>): boolean =>
  Object.keys(body).every((key) => COMPANY_FIELDS.has(key));

const buildCompanyData = (
  body: Record<string, unknown>,
  mode: "create" | "update",
): CompanyWriteData | CompanyUpdateData | null => {
  if (!rejectUnknownFields(body)) return null;

  const data: CompanyWriteData | CompanyUpdateData = {};
  const cnpj = normalizeCnpj(body.cnpj);
  const legalName = normalizeText(body.legalName);

  if (mode === "create" && (!isValidCnpj(body.cnpj) || !cnpj || !legalName)) {
    return null;
  }

  if (mode === "update" && hasOwn(body, "cnpj")) {
    if (!isValidCnpj(body.cnpj) || !cnpj) return null;
    data.cnpj = cnpj;
  }

  if (mode === "create") {
    data.cnpj = cnpj!;
    data.legalName = legalName!;
  } else if (hasOwn(body, "legalName")) {
    if (!legalName) return null;
    data.legalName = legalName;
  }

  const optionalTextFields = [
    "tradeName",
    "street",
    "number",
    "complement",
    "neighborhood",
    "city",
  ] as const;
  for (const field of optionalTextFields) {
    if (hasOwn(body, field)) {
      const value = normalizeOptionalText(body[field]);
      if (value === undefined) return null;
      data[field] = value;
    }
  }

  if (hasOwn(body, "description")) {
    const value = normalizeOptionalText(body.description, MAX_DESCRIPTION_LENGTH);
    if (value === undefined) return null;
    data.description = value;
  }

  if (hasOwn(body, "email")) {
    const value = body.email === null || body.email === "" ? null : normalizeEmail(body.email);
    if (value === undefined) return null;
    data.email = value;
  }

  if (hasOwn(body, "phone")) {
    const value = body.phone === null || body.phone === "" ? null : normalizePhone(body.phone);
    if (value === undefined) return null;
    data.phone = value;
  }

  if (hasOwn(body, "postalCode")) {
    const value = body.postalCode === null || body.postalCode === ""
      ? null
      : normalizePostalCode(body.postalCode);
    if (value === undefined) return null;
    data.postalCode = value;
  }

  if (hasOwn(body, "state")) {
    const value = body.state === null || body.state === "" ? null : normalizeState(body.state);
    if (value === undefined) return null;
    data.state = value;
  }

  if (hasOwn(body, "country")) {
    if (body.country === null || body.country === "") {
      if (mode === "update") return null;
      data.country = "Brasil";
    } else {
      const value = normalizeCountry(body.country);
      if (value === undefined) return null;
      data.country = value;
    }
  } else if (mode === "create") {
    data.country = "Brasil";
  }

  if (mode === "update" && hasOwn(body, "isActive")) {
    if (typeof body.isActive !== "boolean") return null;
    data.isActive = body.isActive;
  }

  if (mode === "update" && Object.keys(data).length === 0) return null;
  return data;
};

export function parseCompanyWriteData(
  value: unknown,
  mode: "create",
): CompanyWriteData | null;
export function parseCompanyWriteData(
  value: unknown,
  mode: "update",
): CompanyUpdateData | null;
export function parseCompanyWriteData(
  value: unknown,
  mode: "create" | "update",
): CompanyWriteData | CompanyUpdateData | null {
  if (!isRecord(value)) return null;
  return buildCompanyData(value, mode);
}

export const parseCompanyId = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(normalized)
    ? normalized
    : null;
};

export const toPublicCompany = (company: PublicCompany): PublicCompany => ({
  id: company.id,
  cnpj: company.cnpj,
  legalName: company.legalName,
  tradeName: company.tradeName,
  description: company.description,
  email: company.email,
  phone: company.phone,
  postalCode: company.postalCode,
  street: company.street,
  number: company.number,
  complement: company.complement,
  neighborhood: company.neighborhood,
  city: company.city,
  state: company.state,
  country: company.country,
  isActive: company.isActive,
  createdAt: company.createdAt,
  updatedAt: company.updatedAt,
});

/*
 * A política mantém CNPJ e campos de endereço normalizados antes da persistência,
 * rejeita mass assignment e expõe somente os campos definidos no contrato público.
 */
