const LOCAL_DEVELOPMENT_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:51333",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
];

function normalizeOrigin(value: string): string | undefined {
  const trimmedValue = value.trim();
  if (
    !trimmedValue ||
    trimmedValue === "null" ||
    trimmedValue === "undefined"
  ) {
    return undefined;
  }

  try {
    const url = new URL(trimmedValue);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return undefined;
    }

    return url.origin;
  } catch {
    return undefined;
  }
}

export function getAllowedCorsOrigins(): string[] {
  const configuredValues = [
    process.env.CORS_ORIGINS,
    process.env.SOCKET_CORS_ORIGINS,
  ]
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => value.split(","));

  const configuredOrigins = configuredValues
    .map(normalizeOrigin)
    .filter((origin): origin is string => Boolean(origin));

  const defaultOrigins =
    process.env.NODE_ENV === "development" ? LOCAL_DEVELOPMENT_ORIGINS : [];

  return [...new Set([...defaultOrigins, ...configuredOrigins])];
}

export function isAllowedCorsOrigin(origin: string): boolean {
  const normalizedOrigin = normalizeOrigin(origin);
  return Boolean(
    normalizedOrigin && getAllowedCorsOrigins().includes(normalizedOrigin),
  );
}
