// utils/resolveTemplate.ts

export function resolveTemplate(
  template: string,
  context: Record<string, any>
) {
  if (!template) return "";

  return template.replace(
    /\{\{(.*?)\}\}/g,
    (_, path) => {
      const value = path
        .trim()
        .split(".")
        .reduce(
          (obj: any, key: string) => obj?.[key],
          context
        );

      return value ?? "";
    }
  );
}