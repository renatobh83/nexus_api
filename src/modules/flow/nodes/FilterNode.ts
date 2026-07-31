export const FilterNode = {
  async execute(node: any, context: Record<string, any>) {
    const field = node.data.props.find(
      (p: { k: string }) => p.k === "Campo",
    )?.v;

    const operator = node.data.props.find(
      (p: { k: string }) => p.k === "Operador",
    )?.v;

    const expected = node.data.props.find(
      (p: { k: string }) => p.k === "Valor",
    )?.v;

    const value = getNestedValue(context, field);

    // Função que converte o valor esperado para o tipo do valor original
    const coerceExpectedToValueType = (value: any, expected: any) => {
      // Se o valor for null ou undefined, retorna o expected como está
      if (value === null || value === undefined) {
        return expected;
      }

      const valueType = typeof value;

      // Se o valor for booleano
      if (valueType === "boolean") {
        if (typeof expected === "string") {
          // Converte "true"/"false" para boolean
          if (expected.toLowerCase() === "true") return true;
          if (expected.toLowerCase() === "false") return false;
        }
        // Se não for "true"/"false", tenta converter para boolean
        return Boolean(expected);
      }

      // Se o valor for número
      if (valueType === "number") {
        const num = Number(expected);
        if (!isNaN(num) && expected !== "") {
          return num;
        }
        // Se não for número válido, retorna o expected como string
        return expected;
      }

      // Se o valor for string, mantém como string
      if (valueType === "string") {
        return String(expected);
      }

      // Para outros tipos, retorna o expected como está
      return expected;
    };

    // Converte o expected para o tipo do value
    const convertedExpected = coerceExpectedToValueType(value, expected);

    // Para operadores de comparação numérica, força conversão para número
    let finalValue = value;
    let finalExpected = convertedExpected;

    // Para operadores > e <, converte ambos para número
    if (operator === ">" || operator === "<") {
      finalValue = Number(value);
      finalExpected = Number(convertedExpected);
    }

    let passed = false;

    switch (operator) {
      case "=":
        // Para igualdade, compara com o tipo convertido
        if (
          typeof finalValue === "boolean" &&
          typeof finalExpected === "boolean"
        ) {
          passed = finalValue === finalExpected;
        } else if (
          typeof finalValue === "number" &&
          typeof finalExpected === "number"
        ) {
          passed = finalValue === finalExpected;
        } else {
          // Para strings, compara ignorando case
          passed =
            String(finalValue).toLowerCase() ===
            String(finalExpected).toLowerCase();
        }
        break;

      case "!=":
        if (
          typeof finalValue === "boolean" &&
          typeof finalExpected === "boolean"
        ) {
          passed = finalValue !== finalExpected;
        } else if (
          typeof finalValue === "number" &&
          typeof finalExpected === "number"
        ) {
          passed = finalValue !== finalExpected;
        } else {
          passed =
            String(finalValue).toLowerCase() !==
            String(finalExpected).toLowerCase();
        }
        break;

      case ">":
        passed = finalValue > finalExpected;
        break;

      case "<":
        passed = finalValue < finalExpected;
        break;

      case "contains":
        // Para contains, sempre converte para string
        passed = String(finalValue)
          .toLowerCase()
          .includes(String(finalExpected).toLowerCase());
        break;
    }

    return {
      ...context,
      route: passed ? "output_1" : "output_2",
    };
  },
};

export function getNestedValue(obj: any, path: string) {
  return path.split(".").reduce((acc, key) => acc?.[key], obj);
}
