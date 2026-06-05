export const TextNode = {
  async execute(node: any, context: any) {
    const mensagem = node.data.props.find((p: any) => p.k === "Mensagem")?.v;
    return {...context, mensagem};
  },
};
