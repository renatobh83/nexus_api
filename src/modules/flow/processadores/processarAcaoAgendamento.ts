export async function processarAcaoAgendamento(context: any) {


    const escopo = "consultaAgendamentos";
    const dados = context[`dados_${escopo}`] ?? {};

    const indice = Number(dados.indice_agendamento);
    const acao = normalizarAcao(dados.acao);

    const agendamentoEscolhido = context.listaAgendamentos?.find(
        (a: any) => a.indice === indice,
    );

    if (!agendamentoEscolhido || !acao) {
        console.error(`[processarAcaoAgendamento] Dados incompletos: indice=${indice}, acao=${acao}`);
        return {
            ...context,
            output: { type: "mensagem", data: "🤖 Não consegui identificar sua escolha. Vamos tentar novamente." },
            route: "output_4", // fallback, ex: volta pro Processar-ia
        };
    }

    const rotas: Record<string, string> = {
        confirmar: "output_1",
        cancelar: "output_2",
        preparo: "output_3",
    };

    const route = rotas[acao] ?? "output_4";

    console.log(`[processarAcaoAgendamento] agendamento=${agendamentoEscolhido.nr_agendamento} acao=${acao} route=${route}`);

    return {
        ...context,
        agendamentoEscolhido, // guarda a referência pro node seguinte usar
        route,
    };
}

function normalizarAcao(valor: string | null | undefined): string | null {
    if (!valor) return null;
    const limpo = valor.toLowerCase().trim();
    const valoresValidos = ["confirmar", "cancelar", "preparo"];
    return valoresValidos.includes(limpo) ? limpo : null;
}