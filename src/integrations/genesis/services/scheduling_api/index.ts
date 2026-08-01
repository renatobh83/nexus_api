import { IntegracaoService } from "../../../../modules/externals/integrationConfig.service.js";
import {
  getWbot,
  Session,
} from "../../../../providers/whatsapp-web/wpp-web/Wpp-web.js";

import { removeNinthDigit } from "../../../../utils/removeNinthDigit.js";

const service = new IntegracaoService();

enum STATUS_CONFIRMACAO {
  RESPONDIDO = "RESPONDIDO",
  CONFIRMADO = "CONFIRMADO",
  CANCELADO = "CANCELADO",
  ERROR = "ERRO NO PROCESSO DE CONFIRMAÇÂO",
  SEM_RESPOSTA = "SEM RESPOSTA",
  ENVIADA = "ENVIADA",
}

// 1. Resolver contato
const resolveContato = async (
  wbot: Session,
  contato: string,
): Promise<string> => {
  const check = await wbot.checkNumberStatus(removeNinthDigit(contato));

  const LidEntry = await wbot.getPnLidEntry(check.id._serialized);

  return check.numberExists ? LidEntry.lid._serialized : contato;
};

// 2. Extrair metadata dos agendamentos
const extractAgendamentoMetadata = (dados: any[], atendimentoData: string) => {
  const horarioMaisCedo = dados.reduce(
    (min, a) => (a.Hora < min.Hora ? a : min),
    dados[0],
  );
  const procedimentos = [...new Set(dados.map((a) => a.Procedimento))];
  const idexterno = [...new Set(dados.map((a) => a.idExterno))];

  return { horarioMaisCedo, procedimentos, idexterno, atendimentoData };
};

// 3. Enviar mensagem de confirmação
const sendConfirmationMessage = async (
  wbot: Session,
  contato: string,
  content: any,
  horarioTexto: string,
  plural: string,
) => {
  const greetings = [
    `Olá ${content.paciente_nome}. 😊`,
    `Oi ${content.paciente_nome}, tudo bem?`,
    `Prezado(a) ${content.paciente_nome},`,
  ];
  const randomGreeting =
    greetings[Math.floor(Math.random() * greetings.length)];

  return wbot.sendListMessage(contato, {
    buttonText: "Confirmar",
    description: bodyMessage(
      randomGreeting,
      plural,
      content.atendimento_data,
      horarioTexto,
    ),
    sections: [
      {
        title: "Confirmação do agendamento",
        rows: [
          {
            rowId: "1",
            title: "✅ Confirmar",
            description: "Desejo confirmar o agendamento.",
          },
          {
            rowId: "2",
            title: "🚫 Cancelar",
            description: "Desejo cancelar o agendamento.",
          },
        ],
      },
    ],
  });
};

// 4. schedulingApi orquestra tudo
export const schedulingApi = async (input: any, content: any, config: any) => {
  const { channelId, integrationName, ...restInput } = input;
  const wbot = getWbot(channelId);

  const contato = await resolveContato(wbot, restInput.contatos[0].contato);
  const { horarioMaisCedo, procedimentos, idexterno } =
    extractAgendamentoMetadata(
      content.dados_agendamentos,
      content.atendimento_data,
    );

  const quantidadeExames = content.dados_agendamentos.length;
  const plural = quantidadeExames > 1 ? "exames agendados" : "exame agendado";
  const horarioTexto =
    quantidadeExames > 1
      ? `a partir das *${horarioMaisCedo.Hora}*`
      : `às ${horarioMaisCedo.Hora}`;

  const ticket = await service.createTicketForIntegration({
    contato,
    channel: { connect: { id: parseInt(channelId) } },
    integrationSource: integrationName,
    isInteraction: true,
    metadata: {
      atendimentoData: content.atendimento_data,
      atendimentoHora: horarioMaisCedo.Hora,
      procedimentos,
      answered: false,
      idexterno,
      config,
    },
  });

  const sendMessage = await sendConfirmationMessage(
    wbot,
    contato,
    content,
    horarioTexto,
    plural,
  );

  if (sendMessage) {
    return service.updateTicketIntegration(ticket.id, {
      contato,
      status: STATUS_CONFIRMACAO.ENVIADA,
      lastMessageAt: sendMessage.timestamp,
      lastMessage: "Confirmação enviada",
    });
  }
};
const bodyMessage = (
  randomGreeting: string,
  plural: string,
  dataAtendimento: string,
  horarioTexto: string,
) => {
  return `${randomGreeting}
Nós, da *Clínica X*, temos um importante lembrete pra você:
🗓 Você tem ${plural} na nossa clínica.
Seu atendimento está agendado para o dia *${dataAtendimento}* ${horarioTexto}.
⚠ *Importante*:
  - Paciente deverá apresentar pedido médico, carteira do convênio e documento de identificação com foto.
  - Trazer todos os exames anteriores realizados da área a ser examinada.`;
};
