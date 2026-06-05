import { MessageInternal } from "../messages.types.js";
import { createTicket, logger } from "../../tickets/Helpers/CreateTicket.js";
import { VerifyMessage } from "./verifyMessage.js";
import { getClientIONamespace } from "../../../lib/socket.js";
import {
  ContactInternal,
  SessionInternal,
} from "../../../providers/session.types.js";

import { FlowExecutorService } from "../../flow/executor/flow-executor.service.js";
import { FlowsService } from "../../flow/flow.service.js";
import { FlowJson } from "../../flow/types.js";
import { nodeRegistry } from "../../flow/nodes/index.js";
import { Prisma } from "@prisma/client";


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

    const result = {
      ...ticket,
      messages: [createdMessage],
    };

    if (isNew) {
      const clientNamespace = getClientIONamespace();
      clientNamespace.emit("ticket-updated", { ...result, isNew });
      if (message.socketId) {
        return { isNew, ticketId: ticket.id };
      }
      if (!ticket.isFlow) {
        return { isNew, ticketId: ticket.id };
      }
      const flow = await flowService.findFirst();
      if (!flow) {
        return { isNew, ticketId: ticket.id };
      }

      const execution = await flowService.createflowExecution({
        flowSnapshot: flow!.flow_json || {},
        status: "running",
        context: {
          ticket,
          mensagem: message.body,
        } as any,
        ticketId: ticket.id.toString(),
        flow: {
          connect: { id: flow!.id }
        },
        moduleName: "Home"
      });

      await FlowExecutorService.startFlow(
        flow!.flow_json as unknown as FlowJson,
        "Home",
        {
          executionId: execution.id,
          ticket: ticket,
          mensagem: message.body,
        },
      );
      return { isNew, ticketId: ticket.id };
      //   running
      // waiting_delay
      // waiting_response
      // completed
      // failed

    } else {
      if (!ticket.isFlow) {
        return { isNew, ticketId: ticket.id };
      }
      const execution = await flowService.flowExecutionFindFirst({
        ticketId: ticket.id.toString(),
        status: "waiting_response"

      });

      if (execution) {
        await flowService.updoateFlowExecution(
          execution.id,
          {
            status: "running"
          }
        );
        await FlowExecutorService.continueFlow(
          execution.flowSnapshot as unknown as FlowJson,
          execution.currentNodeId!,
          {
            ...(execution.context as any),
            mensagem: message.body,
            executionId: execution.id
          },
          execution.moduleName
        );
      } else {

        const flow = await flowService.findFirst()
        if (!flow) {
          return { isNew, ticketId: ticket.id };
        }

        const execution = await flowService.createflowExecution({
          flowSnapshot: flow!.flow_json || {},
          status: "running",
          context: {
            ticket,
            mensagem: message.body,
          } as any,
          ticketId: ticket.id.toString(),
          flow: {
            connect: { id: flow!.id }
          },
          moduleName: "Módulo 1"
        });
        await FlowExecutorService.startFlow(flow?.flow_json as unknown as FlowJson,
          'Módulo 1', {
          executionId: execution.id,
          ticket,
          message: message.body

        })
      }
    }
    //else {
    //   const flow = await flowService.findById("1");
    //   await FlowExecutorService.startFlow(
    //     flow!.flow_json as unknown as FlowJson,
    //     {
    //       ticketId: ticket.id,
    //       mensagemRecebida: createdMessage.body,
    //     },
    //   );
    // }
  } catch (error) {
    console.error(`Erro ao processar mensagem ${message.messageId}:`, error);
  }
};

function isJsonObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}