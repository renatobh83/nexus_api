
import { agendamentoCancela } from "../../../../integrations/genesis/services/autoatendimento/index.js";
import { SessaoPacienteService } from "../../../../integrations/genesis/services/autoatendimento/SessaoPacienteService.js";

export async function cancelarAgendamento(context: any) {

    const ticketId = context.ticket.id
    const sessao = await SessaoPacienteService.obter(ticketId);
    if (!sessao) {
        // sessão expirou ou não existe mais — precisa reidentificar o paciente
        return {
            ...context,
            route: "output_2",
        };
    }
    const cdAtendimentoRaw = context.agendamentoEscolhido.cd_atendimento ?? "";

    const data = await agendamentoCancela({
        cd_atendimento: cdAtendimentoRaw,
        token: sessao.ds_token
    })

    if (data[0].nr_controle) {
        return {
            ...context,
            route: "output_2",
        };
    }

    return {
        ...context,
        agendamentoEscolhido: {},
        listaAgendamentos: [],
        mensagem: "__EXAME_CANCELADO__",
        route: "output_1",
    }
}