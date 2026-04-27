import { getHours } from "date-fns";

const escapeHtml = (string: string): string =>
  string
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const unescapeHtml = (htmlString: string): string =>
  htmlString
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&#0?39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");

export function htmlEscape(
  strings: TemplateStringsArray | string,
  ...values: any[]
): string {
  if (typeof strings === "string") {
    return escapeHtml(strings);
  }

  return strings.reduce(
    (output, part, index) =>
      output + escapeHtml(String(values[index - 1] || "")) + part
  );
}

export function htmlUnescape(
  strings: TemplateStringsArray | string,

  ...values: any[]
): string {
  if (typeof strings === "string") {
    return unescapeHtml(strings);
  }

  return strings.reduce(
    (output, part, index) =>
      output + unescapeHtml(String(values[index - 1] || "")) + part
  );
}

export class MissingValueError extends Error {
  key: string | undefined;

  constructor(key?: string) {
    super(
      `Missing a value for ${key ? `the placeholder: ${key}` : "a placeholder"}`
    );
    this.name = "MissingValueError";
    this.key = key;
  }
}

export const pupa = function pupa(
  template: string,

  data: Record<string, any>,
  {
    ignoreMissing = true,

    transform = ({ value }: { value: any }) => value,
  }: {
    ignoreMissing?: boolean;

    transform?: ({ value, key }: { value: any; key: string }) => any;
  } = {}
): string {
  const getGreeting = (hour = getHours(new Date())): string => {
    if (hour >= 0 && hour <= 11) return "Bom dia!";
    if (hour >= 12 && hour <= 17) return "Boa Tarde!";
    if (hour >= 18 && hour <= 23) return "Boa Noite!";
    return "Olá!";
  };

  // const enhancedData = { ...data, greeting: getGreeting() };

  const enhancedData: Record<string, any> = {
    ...data,
    greeting: getGreeting(),
  };

  const replace = (placeholder: string, key: string): string => {
    const value = key
      .split(".")
      .reduce((acc, property) => acc?.[property], enhancedData);

    const transformedValue = transform({ value, key });
    if (transformedValue === undefined) {
      if (ignoreMissing) return "";
      throw new MissingValueError(key);
    }

    return String(transformedValue);
  };

  const bracePatterns = [
    { regex: /{{(\d+|[a-z$_][\w\-$]*?(?:\.[\w\-$]*?)*?)}}/gi, escape: true },
    { regex: /{(\d+|[a-z$_][\w\-$]*?(?:\.[\w\-$]*?)*?)}/gi, escape: false },
  ];
  let processedTemplate = template;

  for (const { regex, escape } of bracePatterns) {
    processedTemplate = processedTemplate.replace(
      regex,
      escape ? (match, key) => htmlEscape(replace(match, key)) : replace
    );
  }
  return processedTemplate;
};
