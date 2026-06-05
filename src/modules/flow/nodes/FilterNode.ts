
export const FilterNode = {
  async execute(node: any, context: Record<string, any>) {

    const field = node.data.props.find(
      (p: { k: string }) => p.k === "field"
    )?.v;

    const operator = node.data.props.find(
      (p: { k: string }) => p.k === "operator"
    )?.v;

    const expected = node.data.props.find(
      (p: { k: string }) => p.k === "value"
    )?.v;

    const value = getNestedValue(context, field);

    let passed = false;

    switch (operator) {
      case "=":
        passed = value == expected;
        break;

      case "!=":
        passed = value != expected;
        break;

      case ">":
        passed = Number(value) > Number(expected);
        break;

      case "<":
        passed = Number(value) < Number(expected);
        break;
        
      case "contains":
        passed = String(value)
          .toLowerCase()
          .includes(String(expected).toLowerCase());
        break;

    }

    return {
      ...context,
      output: passed ? "output_1" : "output_2"
    };
  }
};
function getNestedValue(obj: any, path: string) {
  return path.split(".").reduce((acc, key) => acc?.[key], obj);
}

