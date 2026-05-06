import { Prisma } from "@prisma/client";
import { getWbot } from "../../../../providers/whatsapp-web/wpp-web/Wpp-web.js";
import { IntegracaoService } from "../../integrationConfig.service.js";

const service = new IntegracaoService();

export const checkBot = async (input: any) => {
  const { contatos } = input;
  const payload = ProcessBodyData(contatos[0].notificacao);

  if (payload.bot === "agenda") {
    schedulingApi(input, payload);
  }
};
const schedulingApi = async (input: any, content: any) => {
  const { channelId, integrationName, ...restIpunt } = input;

  const wbot = getWbot(channelId);
  let contato = restIpunt.contatos[0].contato;
  let checkContato = await wbot.checkNumberStatus(contato);
  if (checkContato.numberExists) {
    contato = checkContato.id._serialized;
  }
  const horarioMaisCedo = content.dados_agendamentos.reduce(
    (min: { Hora: number }, agendamento: { Hora: number }) => {
      return agendamento.Hora < min.Hora ? agendamento : min;
    },
    content.dados_agendamentos[0],
  );

  const novosProcedimentos: any[] = [];
  const novosIdExternos: any[] = [];

  for (const agendamento of content.dados_agendamentos) {
    const { idExterno, Procedimento } = agendamento;
    // Verifique se idExterno já existe em novosIdExternos antes de adicionar
    if (!novosIdExternos.includes(idExterno)) {
      novosIdExternos.push(idExterno);
    }
    // Verifique se Procedimento já existe em novosProcedimentos antes de adicionar
    if (!novosProcedimentos.includes(Procedimento)) {
      novosProcedimentos.push(Procedimento);
    }
  }

  const metadata = {
    atendimentoData: content.atendimento_data,
    atendimentoHora: horarioMaisCedo.Hora,
    procedimentos: novosProcedimentos,
    answered: false,
    idexterno: novosIdExternos,
  };
  const payload = {
    contato: contato,
    channel: { connect: { id: parseInt(channelId) } },
    integrationSource: integrationName,
    isInteraction: true,
    metadata,
  } as unknown as Prisma.TicketCreateInput;

  const greetings = [
    `Olá ${content.paciente_nome}. 😊`,
    `Oi ${content.paciente_nome}, tudo bem?`,
    `Prezado(a) ${content.paciente_nome},`,
  ];
  const ticket = await service.createTicketForIntegration(payload);
  const quantidadeExames = content.dados_agendamentos.length;
  const plural = quantidadeExames > 1 ? "exames agendados" : "exame agendado";
  const horarioTexto =
    quantidadeExames > 1
      ? `a partir das *${ticket.atendimentoHora}*`
      : `às ${ticket.atendimentoHora}`;
  const randomGreeting =
    greetings[Math.floor(Math.random() * greetings.length)];

  const sendMessage = await wbot.sendListMessage(contato, {
    buttonText: "Confirmar",
    description: bodyMessage(randomGreeting, plural, ticket, horarioTexto),
    sections: [
      {
        title: "Confirmação do agendamento",
        rows: [
          {
            rowId: "1",
            title: "✅ Confirmar ",
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
const bodyMessage = (
  randomGreeting: string,
  plural: string,
  ticket: { atendimentoData: any },
  horarioTexto: string,
) => {
  return `${randomGreeting}
Nós, da *Clínica Lume*, temos um importante lembrete pra você:
🗓 Você tem ${plural} na nossa clínica.
Seu atendimento está agendado para o dia *${ticket.atendimentoData}* ${horarioTexto}.
⚠ *Importante*:
  - Paciente deverá apresentar pedido médico, carteira do convênio e documento de identificação com foto.
  - Trazer todos os exames anteriores realizados da área a ser examinada.`;
};

const ProcessBodyData = (body: any): any => {
  let modifiedbody = body;

  const jsonParse = JSON.parse(body);

  const array = jsonParse;

  const dadosAgendamentosArray = array.dados_agendamentos
    .replace(/^\[\(/, "") // Remove o '[(' inicial
    .replace(/\)\]$/, "") // Remove o ')]' final
    .split(/\), \(/) // Divide a string em tuplas
    .map((str: string) => str.split(",")) // Converte cada tupla em um array de valores
    .map((item: any[]) => ({
      idExterno: parseInt(item[0], 10),
      Procedimento: parseInt(item[1], 10),
      Hora: item[2],
    }));

  array.dados_agendamentos = dadosAgendamentosArray;

  modifiedbody = array;

  return modifiedbody;
};
