import { processadores } from "../processadores/index.js";

export const ProcessarDados = {
  async execute(node: any, context: any) {
    
    const dadosDe = node.data.props.find(
      (p: any) => p.k === "Processar dados",
    )?.v;
    
    const handler = processadores[dadosDe];

    if (!handler) {
      console.warn(`[ProcessarDados] Handler "${dadosDe}" não encontrado.`);
      return { ...context, route: "output_2" }; // fallback seguro
    }
    try {
      return await handler(context);
    } catch (err) {
      console.error(`[ProcessarDados] Erro nSo handler "${dadosDe}":`, err);
      return { ...context, route: "output_2" }; // trata erro como "não passou"
    }
  },
};
