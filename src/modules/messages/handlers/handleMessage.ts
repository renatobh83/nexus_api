import { MessageInternal } from "../messages.types.js";
import {
  createTicket,
  logger,
  updateTicket,
} from "../../tickets/Helpers/CreateTicket.js";
import { VerifyMessage } from "./verifyMessage.js";
import { getClientIONamespace } from "../../../lib/socket.js";
import {
  ContactInternal,
  SessionInternal,
} from "../../../providers/session.types.js";

import { FlowExecutorService } from "../../flow/executor/flow-executor.service.js";
import { FlowsService } from "../../flow/flow.service.js";
import { FlowJson } from "../../flow/types.js";
import { ServiceHoursService } from "../../serviceHours/serviceHours.service.js";

import { sendOutOfHoursMessage } from "./HandleSendOutOfHoursMessage.js";

const flowService = new FlowsService();
const svc = new ServiceHoursService();

const formatLastMessage = (message: MessageInternal): string => {
  if (message.type !== "chat") return "Media";
  if (!message.content) return "";
  return message.content.length > 255
    ? message.content.slice(0, 252) + "..."
    : message.content;
};

export const handleMessage = async (
  message: MessageInternal,
  session: SessionInternal,
  contato: ContactInternal,
  userId?: string,
): Promise<void | any> => {
  try {
    const serialized = contato.id._serialized;
    const lastMessage = formatLastMessage(message);
    const { ticket, isNew, isConcurrentMessage } = await createTicket({
      contato: serialized,
      contactOwner: contato,
      session: session,
      ticketGroup: message.isGroupMsg,
      msg: lastMessage,
      unreadMessages: 0,
      chatClient: message.socketId ? true : false,
      socketId: message.socketId,
      ObjMessage: message,
    });

    if (ticket.isInteraction) return;
    if (isConcurrentMessage) {
      logger.info("Mensagem concorrente ignorada durante criação do ticket");
      return;
    }
    const createdMessage = await VerifyMessage(
      message,
      contato,
      ticket.id,
      session,
    );

    const result = { ...ticket, messages: [createdMessage] };

    // Usa message.content de forma consistente com MessageInternal
    const messageBody = message.content ?? (message as any).body ?? "";

    if (isNew) {
      const clientNamespace = getClientIONamespace();
      clientNamespace.emit("ticket-updated", { ...result, isNew });

      if (
        message.socketId ||
        !ticket.isFlow ||
        message.fromMe ||
        ticket.isGroup
      ) {
        return { isNew, ticketId: ticket.id };
      }

      const status = await svc.isWithinServiceHours(ticket.queueId!);

      if (!status.withinHours) {
        if (status.reason === "outside_schedule") {
          await sendOutOfHoursMessage(
            "🤖 Agradeço sua mensagem. Não estou disponível nesse canal. Para suporte acesse nosso chat em www.exp.com.br/contato. \
Nosso horário é 08h às 18h (seg. a sex).\
Obrigado pela compreensão!",
            ticket,
          );
          await updateTicket(ticket.id, {
            status: "closed",
          });
          console.log("fora do horário — avisa o contato e não atribui agente");
          return;
        }
        // fora do horário — avisa o contato e não atribui agente
      }
      const flow = await flowService.findFirst();

      if (!flow || !flow.flow_json) {
        console.warn("Nenhum flow encontrado para ticket novo.");
        await updateTicket(ticket.id, {
          isFlow: false,
          isBot: false,
          queue: {
            connect: { id: "2" },
          },
        });
        return { isNew, ticketId: ticket.id };
      }

      // Validação: verifica se o módulo "Home" existe no flow
      const flowJson = flow.flow_json as unknown as FlowJson;
      const moduleName = "Home";
      if (!hasModule(flowJson, moduleName)) {
        console.warn(`Módulo "${moduleName}" não encontrado no flow.`);
        return { isNew, ticketId: ticket.id };
      }

      const execution = await flowService.createflowExecution({
        flowSnapshot: flow.flow_json,
        status: "running",
        context: { ticket, mensagem: messageBody } as any,
        ticketId: ticket.id.toString(),
        flow: { connect: { id: flow.id } },
        moduleName,
      });

      await FlowExecutorService.startFlow(flowJson, moduleName, {
        executionId: execution.id,
        ticket,
        mensagem: messageBody,
      });

      return { isNew, ticketId: ticket.id };
    } else {
      if (!ticket.isFlow || message.fromMe || ticket.isGroup) {
        return { isNew, ticketId: ticket.id };
      }

      const pendingExecution = await flowService.flowExecutionFindFirst({
        ticketId: ticket.id.toString(),
        status: "waiting_response",
      });

      if (pendingExecution) {
        await flowService.updoateFlowExecution(pendingExecution.id, {
          status: "running",
        });

        await FlowExecutorService.continueFlow(
          pendingExecution.flowSnapshot as unknown as FlowJson,
          pendingExecution.currentNodeId!,
          {
            ...(pendingExecution.context as any),
            mensagem: messageBody,
            executionId: pendingExecution.id,
          },
          pendingExecution.moduleName,
        );
      } else {
        const flow = await flowService.findFirst();
        if (!flow || !flow.flow_json) {
          console.warn("Nenhum flow encontrado para ticket existente.");
          return { isNew, ticketId: ticket.id };
        }

        const flowJson = flow.flow_json as unknown as FlowJson;
        const moduleName = "Módulo 1";

        // Validação: verifica se o módulo existe antes de tentar executar
        if (!hasModule(flowJson, moduleName)) {
          console.warn(
            `Módulo "${moduleName}" não encontrado no flow. Abortando execução.`,
          );
          await updateTicket(ticket.id, {
            isFlow: false,
            isBot: false,
            queue: {
              connect: { id: "2" },
            },
          });
          return { isNew, ticketId: ticket.id };
        }

        const execution = await flowService.createflowExecution({
          flowSnapshot: flow.flow_json,
          status: "running",
          context: { ticket, mensagem: messageBody } as any,
          ticketId: ticket.id.toString(),
          flow: { connect: { id: flow.id } },
          moduleName,
        });

        await FlowExecutorService.startFlow(flowJson, moduleName, {
          executionId: execution.id,
          ticket,
          mensagem: messageBody,
        });
      }

      return { isNew, ticketId: ticket.id }; // <-- return que estava faltando
    }
  } catch (error) {
    console.error(`Erro ao processar mensagem ${message.messageId}:`, error);
  }
};

// Helper: verifica se um módulo existe no FlowJson
function hasModule(flowJson: FlowJson, moduleName: string): boolean {
  if (!isJsonObject(flowJson)) return false;
  const drawflow = (flowJson as any).drawflow;
  if (!isJsonObject(drawflow)) return false;
  return moduleName in drawflow;
}
function isJsonObject(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}
