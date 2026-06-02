// ── Confirmação de exames externos ──────────────────────────────────────────

import { Ticket } from "@prisma/client";
import { getWbot } from "../../providers/whatsapp-web/wpp-web/Wpp-web.js";
import { getExternalApiClient } from "../../lib/externalApi/clients.js";
import { isBase64Meaningful, MENSAGENS } from "./scheduling_helpers.js";
interface ResultadoExame {
  cd_procedimento: number;
  bb_preparo: string | null;
}

export async function processarConfirmacoes(
  ticket: Ticket,
  status: "confirm" | "cancel",
): Promise<PromiseSettledResult<any>[]> {
  const metadata = ticket.metadata as any;
  const idexterno = metadata?.idexterno;

  const config = metadata?.config;

  const operacoes = idexterno.map((id: any) =>
    status === "confirm"
      ? ConfirmarExameApi(+id!, config)
      : CancelarExameApi(+id!, config),
  );

  const resultados = await Promise.allSettled(operacoes);
  // Loga os rejeitados para rastreabilidade
  resultados
    .filter((r) => r.status === "rejected")
    .forEach((r, i) => {
      const reason = (r as PromiseRejectedResult).reason;
      console.error(`Operação ${i} falhou para ticket ${ticket.id}:`, reason);
    });
  return resultados;
}

export function todosResultadosVazios(
  resultados: PromiseSettledResult<any>[],
): boolean {
  return resultados
    .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
    .every((r) => Array.isArray(r.value) && r.value.length === 0);
}

// ── Confirmar exames ────────────────────────────────────────────────────────
async function ConfirmarExameApi(cdAtendimento: number, integracao: any) {
  const client = getExternalApiClient(integracao);
  return client.post(
    "doAgendaConfirmar",
    { cd_atendimento: cdAtendimento.toString() },
    { formEncoded: true },
  );
}

// ── Cancelar exames ────────────────────────────────────────────────────────
async function CancelarExameApi(cdAtendimento: number, integracao: any) {
  const client = getExternalApiClient(integracao);
  return client.post(
    "doAgendaCancelar",
    { cd_atendimento: cdAtendimento.toString() },
    { formEncoded: true },
  );
}
// ── Envio de preparos ────────────────────────────────────────────────────────

export async function enviarPreparos(
  ticket: Ticket,
  wbot: ReturnType<typeof getWbot>,
): Promise<void> {
  const metadata = ticket.metadata as any;
  const procedimentos = metadata?.procedimentos;
  const config = metadata?.config;
  const contatoSend = ticket.contato;
  const preparos = (procedimentos as any[]).map((i) => {
    const client = getExternalApiClient(config);
    return client.post(
      "doProcedimentoPreparo",
      { cd_procedimento: i.toString() },
      { formEncoded: true },
    );
  });

  const resultados = await Promise.allSettled(preparos);

  await wbot.sendText(contatoSend, MENSAGENS.CONFIRMADO_INTRO);
  // `find` em vez de flag booleana manual
  const temSemPreparo = resultados
    .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
    .some((r) => r.value === null);

  if (temSemPreparo) {
    await wbot.sendText(contatoSend, MENSAGENS.SEM_PREPARO);
  }
  for (const resultado of resultados) {
    // 1. Verifica se a Promise foi cumprida
    if (resultado.status === "fulfilled") {
      const listaResultados = resultado.value as ResultadoExame[];
      // 2. Acessa o primeiro item do array (conforme seu exemplo)
      const dados = listaResultados && listaResultados[0];

      // 3. Extrai o conteúdo do preparo
      const preparoBase64 = dados?.bb_preparo;

      // 4. Valida se o preparo existe e é significativo
      if (preparoBase64 && isBase64Meaningful(preparoBase64)) {
        await wbot.sendFile(
          contatoSend,
          `data:text/html;base64,${preparoBase64}`,
          {
            filename: "Preparo do exame.html",
            caption: "Segue o preparo do seu exame!",
          },
        );
      } else {
        await wbot.sendText(contatoSend, MENSAGENS.SEM_PREPARO);
      }
    }
  }
}
