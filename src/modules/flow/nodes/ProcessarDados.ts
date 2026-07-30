type ProcessadorHandler = (context: any) => Promise<any>;

function normalizarCpf(cpf: string): string {
  return cpf.replace(/\D/g, "");
}

function normalizarNome(nome: string): string {
  return nome
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

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
      console.error(`[ProcessarDados] Erro no handler "${dadosDe}":`, err);
      return { ...context, route: "output_2" }; // trata erro como "não passou"
    }
  },
};
async function validarCadastro(context: any) {
  const dados = context.dados_identificacao ?? {};
  const cpf = normalizarCpf(dados.cpf ?? "");
  console.log(dados);

  // const paciente = await prisma.paciente.findFirst({ where: { cpf } });
  const encontrado = false;

  return {
    ...context,
    clienteEncontrado: encontrado,
    pacienteId: null,
    route: encontrado ? "output_1" : "output_2",
  };
}
const processadores: Record<string, ProcessadorHandler> = {
  validarCadastro,
  // futuramente: verificarPagamento, consultarHorarios, cancelarAgendamento, etc.
};
