export async function validarCadastro(context: any) {
  const dados = context.dados_identificacao ?? {};
  const cpf = normalizarCpf(dados.cpf ?? "");

  // const paciente = await prisma.paciente.findFirst({ where: { cpf } });
  const encontrado = true;

  return {
    ...context,
    clienteEncontrado: encontrado,
    pacienteId: null,
    route: encontrado ? "output_1" : "output_2",
  };
}

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
