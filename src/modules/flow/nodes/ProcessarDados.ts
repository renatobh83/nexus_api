export const ProcessarDados = {
  async execute(node: any, context: any) {
    const dadosDe = node.data.props.find((p: any) => p.v)?.v;
    console.log(node.data.props);
    console.log(dadosDe);

    return context;
  },
};
