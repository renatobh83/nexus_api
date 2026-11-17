/**
 * RouterNode
 * Encaminha a execução para o trigger de outro módulo do mesmo fluxo.
 *
 * Props esperadas:
 *   - "Módulo Destino" : nome exato do módulo (ex: "Agendamento")
 *
 * Retorno especial:
 *   { __delegateToModule: "Agendamento", __delegateContext: {...} }
 *   O FlowExecutorService interpreta esse sinal e reinicia a cadeia
 *   no trigger do módulo destino.
 */
export const RouterNode = {
  async execute(node: any, context: Record<string, any>) {
    const props = node.data?.props ?? [];
    const get = (k: string) => props.find((p: { k: any }) => p.k === k)?.v;

    const moduloDestino = (get("Módulo Destino") || "").trim();

    if (!moduloDestino) {
      throw new Error(
        `[RouterNode ${node.id}] Prop "Módulo Destino" não configurada.`,
      );
    }

    if (moduloDestino === node.data?.moduleName) {
      throw new Error(
        `[RouterNode ${node.id}] Módulo destino igual ao módulo atual (loop).`,
      );
    }

    return {
      __delegateToModule: moduloDestino,
      __delegateContext: { ...context },
    };
  },
};
