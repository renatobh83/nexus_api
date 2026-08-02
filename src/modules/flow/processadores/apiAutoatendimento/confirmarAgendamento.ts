import { SessaoPacienteService } from "../../../../integrations/genesis/services/autoatendimento/SessaoPacienteService.js";

export async function confirmarAgendamento(context: any) {

    const ticketId = context.ticket.id
    const sessao = await SessaoPacienteService.obter(ticketId);
    if (!sessao) {
        // sessão expirou ou não existe mais — precisa reidentificar o paciente
        return {
            ...context,
            route: "output_2", // ex: volta pro fluxo de identificação
        };
    }
}