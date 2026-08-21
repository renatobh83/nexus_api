const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_ROLES = new Set(["administrador", "atendente"]);
const MAX_NAME_LENGTH = 120;
const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_LENGTH = 128;

export interface UserCreateData {
  name: string;
  email: string;
  role: string;
  isActive?: boolean;
  passwordHash?: string;
}

export interface UserUpdateData {
  name?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
  passwordHash?: string;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

type UserWriteMode = "create" | "update";
type UserWriteData = UserCreateData | UserUpdateData;
type UnknownRecord = Record<string, unknown>;

/**
 * Retorna o identificador do usuário somente quando ele possui o formato UUID
 * esperado pelo modelo Prisma. Valores arbitrários não chegam ao repository.
 */
export function parseUserId(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim();
  return UUID_PATTERN.test(normalized) ? normalized : null;
}

/**
 * Normaliza um email usado na rota administrativa sem aceitar valores vazios,
 * espaços internos ou entradas maiores que o limite prático de endereços.
 */
export function parseUserEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim();
  if (normalized.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(normalized)) {
    return null;
  }

  return normalized;
}

/**
 * Constrói o único conjunto de campos que pode ser encaminhado ao Prisma. O
 * corpo HTTP pode continuar contendo `id`, `status` e campos legados do Vue,
 * mas eles são ignorados e nunca controlam o registro persistido.
 */
export function parseUserWriteData(
  value: unknown,
  mode: "create",
): UserCreateData | null;
export function parseUserWriteData(
  value: unknown,
  mode: "update",
): UserUpdateData | null;
export function parseUserWriteData(
  value: unknown,
  mode: UserWriteMode,
): UserWriteData | null {
  if (!isRecord(value)) return null;

  const data: UserUpdateData = {};
  const name = readOptionalText(value.name, MAX_NAME_LENGTH);
  const email = parseOptionalEmail(value.email);
  const role = parseOptionalRole(value.role);
  const passwordHash = parseOptionalPassword(value.passwordHash);

  if (value.name !== undefined && name === null) return null;
  if (value.email !== undefined && email === null) return null;
  if (value.role !== undefined && role === null) return null;
  if (value.passwordHash !== undefined && passwordHash === null) return null;
  if (value.isActive !== undefined && typeof value.isActive !== "boolean") {
    return null;
  }

  if (typeof name === "string") data.name = name;
  if (typeof email === "string") data.email = email;
  if (typeof role === "string") data.role = role;
  if (typeof passwordHash === "string") data.passwordHash = passwordHash;
  if (typeof value.isActive === "boolean") data.isActive = value.isActive;

  if (mode === "create") {
    if (!data.name || !data.email || !data.role) return null;
    return data as UserCreateData;
  }

  return Object.keys(data).length > 0 ? data : null;
}

/**
 * Converte um registro interno em resposta segura. Campos de autenticação,
 * presença e timestamps nunca são enviados pelos endpoints administrativos.
 */
export function toPublicUser(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
  };
}

/**
 * Garante que um valor recebido de `request.body` seja um objeto simples, sem
 * aceitar arrays ou valores primitivos como payload de usuário.
 */
function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Normaliza texto editável e aplica o limite de tamanho antes da persistência.
 */
function readOptionalText(
  value: unknown,
  maxLength: number,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return null;

  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= maxLength
    ? normalized
    : null;
}

/**
 * Faz a mesma validação de email para criação e atualização, diferenciando um
 * campo ausente de um campo explicitamente inválido.
 */
function parseOptionalEmail(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  return parseUserEmail(value);
}

/**
 * Permite somente os papéis reconhecidos pelas rotas administrativas e
 * normaliza diferenças de maiúsculas/minúsculas.
 */
function parseOptionalRole(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return null;

  const normalized = value.trim().toLowerCase();
  return ALLOWED_ROLES.has(normalized) ? normalized : null;
}

/**
 * Trata `passwordHash` como senha de entrada por compatibilidade com o Vue,
 * rejeitando tipos incorretos e impedindo que uma edição vazia apague a senha.
 */
function parseOptionalPassword(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return null;
  if (value.length === 0) return undefined;

  return value.length <= MAX_PASSWORD_LENGTH ? value : null;
}
