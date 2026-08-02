import { buscarPreparo } from "../../../../integrations/genesis/services/autoatendimento/index.js";
import { SessaoPacienteService } from "../../../../integrations/genesis/services/autoatendimento/SessaoPacienteService.js";
import { ChannelService } from "../../../channels/channel.service.js";
import { handleSendMessage } from "../../../messages/handlers/handleSendMessage.js";

const channelService = new ChannelService();

export async function preparoExame(context: any) {
    const ticketId = context.ticket.id;
    const sessao = await SessaoPacienteService.obter(ticketId);
    if (!sessao) {
        // sessão expirou ou não existe mais — precisa reidentificar o paciente
        return {
            ...context,
            route: "output_2",
        };
    }

    const cdProcedimentoRaw = context.agendamentoEscolhido.cd_procedimento ?? "";
    if (!cdProcedimentoRaw) {
        return {
            ...context,
            route: "output_2",
        };
    }

    // cd_procedimento pode vir com mais de um código separado por "; " (ex: "66; 67")
    const codigosProcedimento = String(cdProcedimentoRaw)
        .split(";")
        .map((c) => c.trim())
        .filter(Boolean);

    const contato = context.ticket.contato;
    const channelId = context.ticket.channelId;
    const channel = await channelService.findChannelOrThrow(channelId);

    let algumEnviado = false;

    for (const codigo of codigosProcedimento) {
        const data = await buscarPreparo({ cd_procedimento: codigo, token: sessao.ds_token });
        const bbPreparo = data?.[0]?.bb_preparo;

        if (!bbPreparo) {
            // sem preparo para esse procedimento específico, segue pro próximo
            continue;
        }

        const buffer = Buffer.from(bbPreparo, "base64");
        const isPrimeiro = !algumEnviado; // só o primeiro arquivo enviado leva texto

        await handleSendMessage(
            channel,
            contato,
            isPrimeiro
                ? `Olá ${context.nome_completo ?? ""}! Segue em anexo o preparo do exame que você escolheu.`
                : "",
            {
                path: null,
                filename: `Preparo_${context.agendamentoEscolhido.modalidade}_${codigo}.html`,
                buffer: buffer,
            }
        );

        algumEnviado = true;
    }

    if (!algumEnviado) {
        // nenhum dos procedimentos teve preparo encontrado
        return {
            ...context,
            route: "output_2",
        };
    }

    return {
        ...context,
        agendamentoEscolhido: {},
        listaAgendamentos: [],
        mensagem: "__VOLTAR_MENU__",
        route: "output_1",
    };
}