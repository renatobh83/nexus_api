import { schedulingApi } from "./services/scheduling_api/index.js";


export const checkBot = async (input: any, config: any) => {
  const { contatos } = input;
  const payload = ProcessBodyData(contatos[0].notificacao);

  if (payload.bot === "agenda") {
    schedulingApi(input, payload, config);
  }
};

const ProcessBodyData = (body: string): any => {
  const parsed = JSON.parse(body);

  parsed.dados_agendamentos = parsed.dados_agendamentos
    .replace(/^\[\(/, "")
    .replace(/\)\]$/, "")
    .split(/\), \(/)
    .map((str: string) => str.split(","))
    .map(([idExterno, Procedimento, Hora]: string[]) => ({
      idExterno: parseInt(idExterno, 10),
      Procedimento: parseInt(Procedimento, 10),
      Hora,
    }));

  return parsed;
};
