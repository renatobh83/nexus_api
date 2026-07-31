export async function rotearAtendimento(context: any) {
  const intencaoBruta = context.dados_atendimento?.intencao;
  const intencao = normalizarIntencao(intencaoBruta);

  const rotas: Record<string, string> = {
    novo_agendamento: "output_1",
    laudos: "output_2",
    agendamentos_futuros: "output_3",
  };

  const route = intencao ? (rotas[intencao] ?? "output_4") : "output_4";

  console.log(
    `[rotearAtendimento] intencao="${intencaoBruta}" normalizada="${intencao}" route=${route}`,
  );

  return { ...context, route };
}
function normalizarIntencao(valor: string | null | undefined): string | null {
  if (!valor) return null;

  // normaliza: minúsculo, sem acento, sem espaço extra
  const limpo = valor
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  // valores exatos que a IA deveria retornar
  const valoresValidos = ["novo_agendamento", "laudos", "agendamentos_futuros"];
  if (valoresValidos.includes(limpo)) return limpo;

  // fallback: tenta inferir por palavra-chave, caso a IA tenha devolvido texto livre por engano
  const mapaPalavraChave: Record<string, string[]> = {
    novo_agendamento: ["agend", "marcar", "consulta nova", "novo horario"],
    laudos: ["laudo", "exame", "resultado"],
    agendamentos_futuros: [
      "meus agendamento",
      "proxima consulta",
      "consulta marcada",
      "ja marquei",
    ],
  };

  for (const [intencao, palavras] of Object.entries(mapaPalavraChave)) {
    if (palavras.some((p) => limpo.includes(p))) {
      return intencao;
    }
  }

  return null; // realmente não identificou
}
