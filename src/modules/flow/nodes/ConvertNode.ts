export const ConvertNode = {
  async execute(node: any, context: Record<string, any>) {
    const inputType =
      node.data.props.find((p: any) => p.k === "Entrada")?.v || "auto";

    const outputType =
      node.data.props.find((p: any) => p.k === "Saida")?.v || "json";

    const value = context.output?.data ?? context.data;

    let detectedType = inputType;

    if (inputType === "auto") {
      if (Array.isArray(value)) {
        detectedType = "array";
      } else if (typeof value === "string") {
        try {
          JSON.parse(value);
          detectedType = "json-string";
        } catch {
          detectedType = "string";
        }
      } else if (typeof value === "object" && value !== null) {
        detectedType = "json";
      }
    }

    let result: any = value;

    switch (outputType) {
      case "array":
        result = convertToArray(value);
        break;

      case "json":
        result = convertToJson(value);
        break;

      case "string":
        result = convertToString(value);
        break;
    }

    return {
      ...context,

      output: {
        type: outputType,
        data: result,
      },

      outputs: {
        ...(context.outputs || {}),

        [node.id]: {
          type: outputType,
          data: result,
        },
      },
    };
  },
};

function convertToArray(value: any): any[] {
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) return parsed;

      return [parsed];
    } catch {
      return [value];
    }
  }

  if (typeof value === "object" && value !== null) {
    return [value];
  }

  return [value];
}

function convertToJson(value: any): any {
  if (typeof value === "object") return value;

  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return { value };
    }
  }

  return { value };
}

function convertToString(value: any): string {
  if (typeof value === "string") return value;

  return JSON.stringify(value, null, 2);
}