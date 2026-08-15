import { buscarAtendimento } from "../../../../integrations/genesis/services/autoatendimento/index.js";
import { SessaoPacienteService } from "../../../../integrations/genesis/services/autoatendimento/SessaoPacienteService.js";


export async function laudos(context: any) {

    const ticketId = context.ticket.id
    const sessao = await SessaoPacienteService.obter(ticketId);

    if (!sessao) {
        // sessão expirou ou não existe mais — precisa reidentificar o paciente
        return {
            ...context,
            route: "output_2", // ex: volta pro fluxo de identificação
        };
    }
    const data = await buscarAtendimento({ cd_paciente: sessao.cd_paciente, ds_token: sessao.ds_token })

    if (!data.length) {
        return {
            ...context,
            route: "output_3",
        };
    }
    const laudosPaciente = data
        .filter((i: { nr_laudo: null }) => i.nr_laudo !== null)
        .filter((a: { sn_assinado: boolean }) => a.sn_assinado === true)
        .sort((a: { dt_data: string }, b: { dt_data: string }) => {
            const dateA = new Date(a.dt_data.split("/").reverse().join("-"));
            const dateB = new Date(b.dt_data.split("/").reverse().join("-"));
            return dateB.getTime() - dateA.getTime();
        }).slice(0, 5)
    const laudosDisponiveis = laudosPaciente.map((l: any, i: number) => ({
        indice: i + 1,
        procedimento: l.ds_procedimento,
        data: l.dt_data,
        nr_laudo: l.nr_laudo,
        cd_exame: l.cd_exame,
        cd_paciente: l.cd_paciente
    }));
   if (!laudosDisponiveis.length) {
        return {
            ...context,
            route: "output_3",
        };
    }
    return {
        ...context,
        laudosDisponiveis,
        route: "output_1"
    }

}