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
import {
  enviarPreparos,
  processarConfirmacoes,
  todosResultadosVazios,
} from "./scheduling_actions.js";

const integracaoService = new IntegracaoService();
async function handleConfirmacao(job: Job<ConfirmacaoJobData>): Promise<void> {
  const { response, status, ticket } = job.data;

  const wbot = getWbot(ticket.channelId);

  // Marca como respondido imediatamente
  await integracaoService.updateTicketIntegration(ticket.id, {
    status: STATUS_CONFIRMACAO.RESPONDIDO,
    lastMessage: response,
    answered: true,
    lastMessageAt: new Date().getTime(),
  });

  if (status === "invalid") {
    await wbot.sendText(ticket.contato, MENSAGENS.INVALIDA);
    return;
  }
  // const integracao = await integracaoService.getIntegrationConfig(ticket.integrationSource)
  const resultados = await processarConfirmacoes(ticket, status);

  if (todosResultadosVazios(resultados)) {
    logger.warn(`Ticket ${ticket.id}: nenhum retorno válido da API externa.`);
    return;
  }

  if (status === "confirm") {
    await enviarPreparos(ticket, wbot);
    await integracaoService.updateTicketIntegration(ticket.id, {
      status: STATUS_CONFIRMACAO.CONFIRMADO,
      metadata: {
        ...(ticket.metadata as Record<string, any>),
        preparoEnviado: true, // 2. Adiciona ou atualiza este valor específi
        config: {},
      },
      closedAt: new Date().getTime(),
      lastMessage: "Preparo de exame enviado",
      lastMessageAt: new Date().getTime(),
    });
  } else {
    await wbot.sendText(ticket.contato, MENSAGENS.CANCELADO);
    await integracaoService.updateTicketIntegration(ticket.id, {
      status: STATUS_CONFIRMACAO.CANCELADO,
      metadata: {
        ...(ticket.metadata as Record<string, any>),
        config: {},
      },
      closedAt: new Date().getTime(),
      lastMessage: "Exame cancelado",
      lastMessageAt: new Date().getTime(),
    });
  }

  await delay(DELAYS.BEFORE_CLOSING);
  await wbot.sendText(ticket.contato, MENSAGENS.ENCERRAMENTO);
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
