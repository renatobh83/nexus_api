// workers/ticketIntegration.worker.ts
import { Worker, Job } from "bullmq";
import { redisConnection } from "../config/redis.js";
import { TicketIntegrationJobData } from "../queues/ticketIntegration.queue.js";

const worker = new Worker<TicketIntegrationJobData>(
  "ticket-integration",
  async (job: Job<TicketIntegrationJobData>) => {
    const { ticket, status, rawResponse } = job.data;

    // lógica real aqui: enviar mensagem, atualizar ticket, etc.
    console.log(`Processando ticket ${ticket.id} — status: ${status}`);
  },
  {
    connection: redisConnection,
    concurrency: 5, // quantos jobs simultâneos o worker processa
  },
);
worker.on("active", (job) => {
  console.log(`[worker] iniciou job ${job.id}`);
});
worker.on("completed", (job) => {
  console.log(`[worker] concluiu job ${job.id}`);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} falhou:`, err.message);
});
worker.on("error", (err) => {
  console.error("[worker] erro interno:", err.message);
});
