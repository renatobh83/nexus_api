import { MessageInternal } from "../messages.types.js";
import { createTicket } from "../../tickets/Helpers/CreateTicket.js";
import { VerifyMessage } from "./verifyMessage.js";
import { getClientIONamespace } from "../../../lib/socket.js";
import {
  ContactInternal,
  SessionInternal,
} from "../../../providers/session.types.js";

import { FlowExecutorService } from "../../flow/executor/flow-executor.service.js";
import { FlowsService } from "../../flow/flow.service.js";
import { FlowJson } from "../../flow/types.js";


const flowService = new FlowsService();

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
  userId?: string
): Promise<void | any> => {
  try {
    const serialized = contato.id._serialized;
    const lastMessage = formatLastMessage(message);
    console.log(message)
    const { ticket, isNew } = await createTicket({
      contato: serialized,
      contactOwner: contato,
      channelId: session.id,
      ticketGroup: message.isGroupMsg,
      msg: lastMessage,
      unreadMessages: 0,
      chatClient: message.socketId ? true : false,
      socketId: message.socketId,
    });

    if (ticket.isInteraction) return;

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
      // TODO colocar para nao pegar as mensagens que eu envio para entrar no flow
      if (message.socketId || !ticket.isFlow || message.fromMe || ticket.isGroup) {
        return { isNew, ticketId: ticket.id };
      }

      const flow = await flowService.findFirst();
      if (!flow || !flow.flow_json) {
        console.warn("Nenhum flow encontrado para ticket novo.");
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
      // TODO colocar para nao pegar as mensagens que eu envio para entrar no flow
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
          pendingExecution.moduleName
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
          console.warn(`Módulo "${moduleName}" não encontrado no flow. Abortando execução.`);
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
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}