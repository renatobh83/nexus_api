const MAX_TENTATIVAS = 3;

export const IncrementarTentativaNode = {
  async execute(node: any, context: any) {
    const maxProp = node.data.props.find(
      (p: any) => p.k === "maxTentativas",
    )?.v;
    const maxTentativas = Number(maxProp) || MAX_TENTATIVAS;

    const tentativas = (context.tentativasIdentificacao ?? 0) + 1;
    const excedeu = tentativas >= maxTentativas;
    console.log(
      `[Tentativas] ticket=${context.ticket.id} tentativa=${tentativas}/${maxTentativas}`,
      context,
    );
    return {
      ...context,
      dados_identificacao: {}, // limpa pra IA perguntar de novo sem "vício" do valor errado
      etapaConcluida_identificacao: false,
      tentativasIdentificacao: tentativas,
      tentativasExcedidas: excedeu,
    };
  },
};
