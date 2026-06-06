import { FlowJson } from "../types.js";
import { FlowParser } from "./FlowParser.js";
import { nodeRegistry } from "../nodes/index.js";
import { FlowsService } from "../flow.service.js";

const flowExecutionService = new FlowsService()

export class FlowExecutorService {
  /**
   * Inicia um fluxo pelo Trigger
   */
  static async startFlow(
    flow: FlowJson,
    moduleName: string,
    context: Record<string, any> = {},
  ): Promise<void> {
    const nodes = FlowParser.getNodes(flow, moduleName);

    const trigger = nodes.find((node) => node.data.type === "trigger");

    if (!trigger) {
      throw new Error("Trigger não encontrado");
    }

    await this.executeNode(flow, trigger.id.toString(), context, moduleName);
  }

  /**
   * Continua uma execução pausada
   */
  static async continueFlow(
    flow: FlowJson,
    nodeId: string,
    context: Record<string, any> = {},
    moduleName: string
  ): Promise<void> {
    await this.executeNode(flow, nodeId, context, moduleName);
  }

  /**
   * Executa um nó e segue para os próximos
   */
  private static async executeNode(
    flow: FlowJson,
    nodeId: string,
    context: Record<string, any>,
    moduleName: string
  ): Promise<void> {
    const node = FlowParser.findNode(flow, nodeId, moduleName);

    if (!node) {
      throw new Error(`Node ${nodeId} não encontrado`);
    }

    const executor = nodeRegistry[node.data.type as keyof typeof nodeRegistry];

    if (!executor) {
      throw new Error(`Executor não encontrado para o node ${node.data.type}`);
    }

    console.log(`[FLOW] Executando node ${node.id} (${node.data.type})`);

    const result = await executor.execute(node, context);

    if (result?.__waitResponse) {
      const { __waitResponse, ...contextToSave } = result;
      const nextNodes = FlowParser.getNextNodes(node);


      await flowExecutionService.updoateFlowExecution(
        context.executionId,
        {
          status: "waiting_response",
          currentNodeId: nextNodes[0],
          context: contextToSave
        }
      );

      return;
    }


    /**
     * DelayNode ou WaitResponseNode
     * podem retornar null para interromper
     */
    if (result === null) {
      return;
    }
    // 3. Saídas específicas
    if (result?.route) {
      const outputKey = result.route;

      const { route, ...cleanResult } = result;

      const nodeOutput = node.outputs?.[outputKey];

      if (!nodeOutput) {
        console.warn(`Saída ${outputKey} não encontrada`);
        return;
      }

      for (const conn of nodeOutput.connections) {
        await this.executeNode(
          flow,
          conn.node.toString(),
          cleanResult,
          moduleName
        );
      }

      return;
    }

    // 4. Fluxo padrão

    const nextNodes = FlowParser.getNextNodes(node);


    if (!nextNodes.length) {
      console.log(`[FLOW] Fluxo finalizado no node ${node.id}`);

      return;
    }


    for (const nextNodeId of nextNodes) {
      await this.executeNode(flow, nextNodeId, result, moduleName);
    }
  }
}
