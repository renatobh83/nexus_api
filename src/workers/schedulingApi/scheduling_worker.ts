// workers/confirmacao/confirmacao.worker.ts
import { Worker, Job } from "bullmq";
import { getWbot } from "../../providers/whatsapp-web/wpp-web/Wpp-web.js";
import { IntegracaoService } from "../../modules/externals/integrationConfig.service.js";
import { delay, DELAYS, MENSAGENS } from "./scheduling_helpers.js";
import {
  ConfirmacaoJobData,
  STATUS_CONFIRMACAO,
} from "../../types/schedulingApi.types.js";
import { logger } from "../../modules/tickets/Helpers/CreateTicket.js";
import { redisConnection } from "../../config/redis.js";
import { processarConfirmacoes } from "./scheduling_actions.js";

const integracaoService = new IntegracaoService();
async function handleConfirmacao(job: Job<ConfirmacaoJobData>): Promise<void> {
  const { contatoSend, response, status, ticket } = job.data;
  const wbot = getWbot(ticket.channelId);

  // Marca como respondido imediatamente
  await integracaoService.updateTicketIntegration(ticket.id, {
    status: STATUS_CONFIRMACAO.RESPONDIDO,
    lastMessage: response,
    answered: true,
    lastMessageAt: new Date().getTime(),
  });

  if (status === "invalid") {
    await wbot.sendText(contatoSend, MENSAGENS.INVALIDA);
    return;
  }

  const resultados = await processarConfirmacoes(ticket, status);

  // if (todosResultadosVazios(resultados)) {
  //   logger.warn(`Ticket ${ticket.id}: nenhum retorno válido da API externa.`);
  //   return;
  // }

  if (status === "confirm") {
    // await enviarPreparos(contatoSend, ticket, integracao, wbot);
    // await iGenesisServices.updateTicketConfirmacao(ticket.id, {
    //   status: STATUS_CONFIRMACAO.CONFIRMADO,
    //   preparoEnviado: true,
    //   closedAt: new Date().getTime(),
    //   lastMessage: "Preparo de exame enviado",
    //   lastMessageAt: new Date().getTime(),
    // });
  } else {
    // await wbot.sendText(contatoSend, MENSAGENS.CANCELADO);
    // await iGenesisServices.updateTicketConfirmacao(ticket.id, {
    //   status: STATUS_CONFIRMACAO.CANCELADO,
    //   closedAt: new Date().getTime(),
    //   lastMessage: "Exame cancelado",
    //   lastMessageAt: new Date().getTime(),
    // });
  }

  await delay(DELAYS.BEFORE_CLOSING);
  // await wbot.sendText(contatoSend, MENSAGENS.ENCERRAMENTO);
}

export const confirmacaoWorker = new Worker<ConfirmacaoJobData>(
  "ticket-integration",
  async (job) => {
    try {
      await handleConfirmacao(job);
    } catch (error: any) {
      logger.error(
        `[confirmacaoWorker] job ${job.id} falhou: ${error.message}`,
      );
      throw error; // relança para o BullMQ registrar como failed e tentar retry
    }
  },
  {
    connection: redisConnection,
    concurrency: 5,
  },
);

confirmacaoWorker.on("completed", (job) =>
  logger.info(`[confirmacaoWorker] job ${job.id} concluído`),
);
confirmacaoWorker.on("failed", (job, err) =>
  logger.error(`[confirmacaoWorker] job ${job?.id} falhou: ${err.message}`),
);
