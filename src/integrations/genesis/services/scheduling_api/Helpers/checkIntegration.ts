import { ticketIntegrationQueue } from "../../../../../queues/ticketIntegration.queue.js";
import { checkBot } from "../../../index.js";
import { IntegracaoService } from "../../../../../modules/externals/integrationConfig.service.js";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ICheckIntegration {
  channelId: string;
  clientId: string;
  integrationName: string;
  body: any;
}

interface ICheckTicketInput {
  chatId: string;
  body?: string;
  content?: string;
  listResponse?: {
    singleSelectReply: {
      selectedRowId: string;
    };
  };
}
export type TicketResponseStatus = "confirm" | "cancel" | "invalid";

export interface ITicketIntegrationResult {
  ticket: any; // substitua pelo tipo real quando tiver
  status: TicketResponseStatus;
  rawResponse: string | number;
}
// ─── Constants ────────────────────────────────────────────────────────────────
const MESSAGES_FOR_CANCEL: Array<string | number> = [
  "nao",
  "não",
  2,
  "2",
  "cancelar",
  "cancela",
  "cancelamento",
];

const MESSAGES_FOR_CONFIRM: Array<string | number> = [
  "sim",
  1,
  "1",
  "confirma",
  "confirmar",
  "confirmacao",
];
// ─── Helpers ──────────────────────────────────────────────────────────────────
function classifyResponse(raw: string | number): TicketResponseStatus {
  if (typeof raw === "string") {
    const normalized = raw.trim().toLowerCase();

    // Rejeita respostas compostas (múltiplas palavras)
    if (normalized.includes(" ")) return "invalid";

    if (MESSAGES_FOR_CANCEL.includes(normalized)) return "cancel";
    if (MESSAGES_FOR_CONFIRM.includes(normalized)) return "confirm";

    return "invalid";
  }

  // Valor numérico direto
  if (MESSAGES_FOR_CANCEL.includes(raw)) return "cancel";
  if (MESSAGES_FOR_CONFIRM.includes(raw)) return "confirm";

  return "invalid";
}

function extractRawResponse(input: ICheckTicketInput): string | number {
  if (input.listResponse) {
    return input.listResponse.singleSelectReply.selectedRowId;
  }
  return input.body ?? input.content ?? "";
}
// ─── Services ─────────────────────────────────────────────────────────────────

const integracaoService = new IntegracaoService();
export const checkIntegration = async (input: ICheckIntegration) => {
  try {
    const config = await integracaoService.getIntegrationConfig(
      input.integrationName,
      input.clientId,
    );

    if (!config || !config.isActive) {
      throw new Error("Integração não existe ou não esta ativa!");
    }

    if (input.integrationName === "scheduling_api") {
      await checkBot(input, config);
    } else {
      return;
    }
  } catch (error) {
    throw new Error(`${error}`);
  }
};
export const checkTicketIntegration = async (input: any) => {
  const ticket = await integracaoService.findTicketIntegrationn(input.chatId);

  if (!ticket) return null;

  const rawResponse = extractRawResponse(input);
  const status = classifyResponse(rawResponse);

  const job = await ticketIntegrationQueue.add(
    "process-response",
    { ticket, status, rawResponse },
    {
      attempts: 3, // retenta até 3x em caso de falha
      backoff: { type: "exponential", delay: 1000 },
    },
  );

  console.log("Job enfileirado:", job.id, job.name);
  return true;
};
