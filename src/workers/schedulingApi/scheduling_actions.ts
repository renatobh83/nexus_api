// ── Confirmação de exames externos ──────────────────────────────────────────

import { Ticket } from "@prisma/client";
import { getWbot } from "../../providers/whatsapp-web/wpp-web/Wpp-web.js";

export async function processarConfirmacoes(
  ticket: Ticket,
  status: "confirm" | "cancel",
  integracao?: any,
): Promise<void> {
  const metadata = ticket.metadata as any;
  const idexterno = metadata?.idexterno;
  console.log(status);
  const operacoes = idexterno.map(
    (id: any) =>
      status === "confirm"
        ? console.log("Confirmar") //ConfirmarExameApi(+id!, integracao)
        : console.log("Cancelar"), //CancelarAgendamento({ integracao, cdAtendimento: +id! }),
  );
  console.log(operacoes);
  // const resultados = await Promise.allSettled(operacoes);
  // // Loga os rejeitados para rastreabilidade
  // resultados
  //   .filter((r) => r.status === "rejected")
  //   .forEach((r, i) => {
  //     const reason = (r as PromiseRejectedResult).reason;
  //     console.error(`Operação ${i} falhou para ticket ${ticket.id}:`, reason);
  //   });
  // return resultados;
}

export function todosResultadosVazios(
  resultados: PromiseSettledResult<any>[],
): boolean {
  return resultados
    .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
    .every((r) => Array.isArray(r.value) && r.value.length === 0);
}

// ── Envio de preparos ────────────────────────────────────────────────────────

export async function enviarPreparos(
  contatoSend: string,
  ticket: Ticket,
  integracao: any,
  wbot: ReturnType<typeof getWbot>,
): Promise<void> {
  // const preparos = (ticket.procedimentos as any[]).map((i) =>
  //   getPreparoExteno({ integracao, atedimento: i }),
  // );
  // const resultados = await Promise.allSettled(preparos);
  // await wbot.sendText(contatoSend, MENSAGENS.CONFIRMADO_INTRO);
  // // `find` em vez de flag booleana manual
  // const temSemPreparo = resultados
  //   .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
  //   .some((r) => r.value === null);
  // if (temSemPreparo) {
  //   await wbot.sendText(contatoSend, MENSAGENS.SEM_PREPARO);
  // }
  // for (const resultado of resultados) {
  //   if (
  //     resultado.status === "fulfilled" &&
  //     isBase64Meaningful(resultado.value)
  //   ) {
  //     await wbot.sendFile(
  //       contatoSend,
  //       `data:text/html;base64,${resultado.value}`,
  //       {
  //         filename: "Preparo do exame.html",
  //         caption: "Segue o preparo do seu exame!",
  //       },
  //     );
  //   }
  // }
}
