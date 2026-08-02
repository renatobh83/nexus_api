import { buscarPreparo } from "../../../integrations/genesis/services/autoatendimento/index.js";
import { SessaoPacienteService } from "../../../integrations/genesis/services/autoatendimento/SessaoPacienteService.js";
import { ChannelService } from "../../channels/channel.service.js";
import { handleSendMessage } from "../../messages/handlers/handleSendMessage.js";
const channelService = new ChannelService();

export async function preparoExame(context: any) {
    const ticketId = context.ticket.id
    const sessao = await SessaoPacienteService.obter(ticketId);
    if (!sessao) {
        // sessão expirou ou não existe mais — precisa reidentificar o paciente
        return {
            ...context,
            route: "output_2", // ex: volta pro fluxo de identificação
        };
    }
    const cdProcedimento = context.agendamentoEscolhido.cd_procedimento ?? ""
    if (!cdProcedimento) {
        return {
            ...context,
            route: "output_2", // ex: volta pro fluxo de identificação
        };
    }

    const data = await buscarPreparo({ cd_procedimento: cdProcedimento, token: sessao.ds_token })
    if (!data[0].bb_preparo) {
        return {
            ...context,
            route: "output_2", // ex: volta pro fluxo de identificação
        };
    }
    const blob = data[0].bb_preparo;
    const buffer = Buffer.from(blob, "base64");
     const contato = context.ticket.contato;

    const channelId = context.ticket.channelId;

    const channel = await channelService.findChannelOrThrow(channelId);
    console.log(context)
    await handleSendMessage(channel, contato,
        `Olá ${context.nome_completo ?? ""}! Segue em anexo o preparo do exame que você escolheu.`, {
        path: null,
        filename: `Preparo_${context.agendamentoEscolhido.modalidade}.html`,
        buffer: buffer
    });
    return {
        ...context,
        agendamentoEscolhido: {},
        listaAgendamentos: [],
        mensagem: "__VOLTAR_MENU__",
        route: "output_1"
    };
}