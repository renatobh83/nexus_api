import { buscarAgendamentos } from "../../../../integrations/genesis/services/autoatendimento/index.js";
import { SessaoPacienteService } from "../../../../integrations/genesis/services/autoatendimento/SessaoPacienteService.js";


export async function consultarAgendamentos(context: any) {

  const ticketId = context.ticket.id
  const sessao = await SessaoPacienteService.obter(ticketId);
  if (!sessao) {
    // sessão expirou ou não existe mais — precisa reidentificar o paciente
    return {
      ...context,
      route: "output_2", // ex: volta pro fluxo de identificação
    };
  }
  const data = await buscarAgendamentos({
    cd_paciente: sessao.cd_paciente,
    token: sessao.ds_token
  })
  console.log(data)
  if (!data.length) {
    return {
      ...context,
      mensagem: "__VOLTAR_MENU__",
      etapaConcluida_atendimento: false,
      route: "output_2", // ex: volta pro fluxo de identificação
    };
  }
  const listaAgendamentos = data
    .filter(
      (i: { ds_status: string; dt_data: string; dt_hora: string }) => {
        if (i.ds_status === "CANCELADO") return false;

        const [dia, mes, ano] = i.dt_data.split("/");
        const hora = i.dt_hora?.split(" - ")[0] || "00:00";
        const [h, m] = hora.split(":").map(Number);

        const dataAgendada = new Date(
          `${ano}-${mes}-${dia}T${String(h).padStart(2, "0")}:${String(
            m
          ).padStart(2, "0")}:00`
        );

        return dataAgendada.getTime() > Date.now(); // só mantém se a data/hora for no futuro
      }
    )
    .sort(
      (
        a: {
          dt_data: { split: (arg0: string) => [any, any, any] };
          dt_hora: string;
        },
        b: {
          dt_data: { split: (arg0: string) => [any, any, any] };
          dt_hora: string;
        }
      ) => {
        const [diaA, mesA, anoA] = a.dt_data.split("/");
        const [diaB, mesB, anoB] = b.dt_data.split("/");

        const dataA = new Date(`${anoA}-${mesA}-${diaA}`);
        const dataB = new Date(`${anoB}-${mesB}-${diaB}`);

        if (dataA.getTime() !== dataB.getTime()) {
          return dataA.getTime() - dataB.getTime(); // primeiro por data (decrescente)
        }

        const horaA = a.dt_hora?.split(" - ")[0] || "00:00";
        const horaB = b.dt_hora?.split(" - ")[0] || "00:00";

        const [hA, mA] = horaA.split(":").map(Number);
        const [hB, mB] = horaB.split(":").map(Number);

        const minutosA = hA! * 60 + mA!;
        const minutosB = hB! * 60 + mB!;

        return minutosA - minutosB; // ordem decrescente por hora
      }
    )
    .slice(0, 5).map((l: any, i: number) => ({
      indice: i + 1,
      modalidade: l.ds_modalidade,
      data: l.dt_data,
      hora: l.dt_hora,
      cd_atendimento: l.cd_atendimento,
      cd_paciente: l.cd_paciente,
      cd_procedimento: l.cd_procedimento
    }));

  if (!listaAgendamentos.length) {
    return {
      ...context,
      output: {
        type: "mensagem",
        data: `🤖 Não encontrei nenhum agendamento para os dados informados.`,
      },
      mensagem: "__VOLTAR_MENU__",
      etapaConcluida_atendimento: false,
      route: "output_2"
    }
  }

  return {
    ...context,
    listaAgendamentos,
    route: "output_1"
  }
}