export const FilterNode = {
  async execute(node: any, context: any) {
    const campo = node.data.props.find((p: any) => p.k === "Campo")?.v;

    const valor = node.data.props.find((p: any) => p.k === "Op.")?.v;

    if (context[campo] !== valor) {
      throw new Error("Filtro não aprovado");
    }

    return context;
  },
};
