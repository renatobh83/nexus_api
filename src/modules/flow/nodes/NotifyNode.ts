export const NotifyNode = {
  async execute(node: any, context: any) {
    const canal = node.data.props.find((p: any) => p.k === "Canal")?.v;

    console.log(`Enviando para ${canal}`);

    return;
  },
};
