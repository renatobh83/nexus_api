export const VoltarAnteriorNode = {
  async execute(node: any, context: Record<string, any>) {
    const historico = context.__historicoModulos || [];

    // Pega o último módulo e remove da pilha
    const moduloAnterior = historico.pop();

    if (!moduloAnterior) {
      // Se não tem histórico, volta para Home
      return {
        __delegateToModule: "Home",
        __delegateContext: { ...context, __historicoModulos: historico },
      };
    }

    // Retorna o sinal para o FlowExecutorService pular para o módulo anterior
    return {
      __delegateToModule: moduloAnterior,
      __delegateContext: { ...context, __historicoModulos: historico },
    };
  },
};
