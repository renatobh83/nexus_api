import { baixarLaudo } from "../../../integrations/genesis/services/autoatendimento/index.js";
import { SessaoPacienteService } from "../../../integrations/genesis/services/autoatendimento/SessaoPacienteService.js";

export async function baixarEEnviarLaudo(context: any) {
    const escopo = "consultar_laudos";
    const indice = Number(context[`dados_${escopo}`]?.indice_escolhido);

    const laudoEscolhido = context.laudosDisponiveis?.find((l: any) => l.indice === indice);
    if (!laudoEscolhido) {
        console.error(`[baixarEEnviarLaudo] Índice ${indice} não encontrado em laudosDisponiveis`);
        return { ...context, route: "output_2" };
    }

    const ticketId = context.ticket.id
    const sessao = await SessaoPacienteService.obter(ticketId);

    if (!sessao) {
        return { ...context, route: "output_2" }; // sessão expirou nesse meio tempo
    }
    console.log(laudoEscolhido)
    console.log(context)
    // const data = await baixarLaudo({})

}