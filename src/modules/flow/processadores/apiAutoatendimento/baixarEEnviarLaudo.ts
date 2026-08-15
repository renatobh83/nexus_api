import { baixarLaudo } from "../../../../integrations/genesis/services/autoatendimento/index.js";
import { SessaoPacienteService } from "../../../../integrations/genesis/services/autoatendimento/SessaoPacienteService.js";
import { ChannelService } from "../../../channels/channel.service.js";
import { handleSendMessage } from "../../../messages/handlers/handleSendMessage.js";


const channelService = new ChannelService();

export async function baixarEEnviarLaudo(context: any) {

    const escopo = "laudos";
    const indice = Number(context[`dados_${escopo}`]?.indice_escolhido);

    const laudoEscolhido = context.laudosDisponiveis?.find((l: any) => l.indice === indice);

    if (!laudoEscolhido) {
        console.error(`[baixarEEnviarLaudo] Índice ${indice} não encontrado em laudosDisponiveis`);
        return { ...context, route: "output_2" };
    }

    const ticketId = context.ticket.id
    const sessao = await SessaoPacienteService.obter(ticketId);

    if (!sessao) {
        return { ...context, route: "output_2" };
    }

    const data = await baixarLaudo({ cd_paciente: laudoEscolhido.cd_paciente, cd_exame: laudoEscolhido.cd_exame, token: sessao.ds_token })

    if (!data || data.byteLength === 0) {
        return { ...context, route: "output_2" };
    }

    const pdfBuffer = Buffer.from(await data);

    const contato = context.ticket.contato;

    const channelId = context.ticket.channelId;

    const channel = await channelService.findChannelOrThrow(channelId);

    await handleSendMessage(channel, contato,
        `Olá ${context.nome_completo ?? ""}! Segue em anexo o laudo do exame que você escolheu.`, {
        path: null,
        filename: `laudo_${laudoEscolhido.procedimento}.pdf`,
        buffer: pdfBuffer
    });
    return {
        ...context, 
        dados_laudos: {},                    // limpa a intenção anterior ("laudos")
        etapaConcluida_laudos: false,
        mensagem: "__VOLTAR_MENU__", 
        route: "output_1"
    };

}