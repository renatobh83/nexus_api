import { FlowJson } from "../types.js";
import { FlowParser } from "./FlowParser.js";
import { nodeRegistry } from "../nodes/index.js";

export class FlowExecutorService {
  /**
   * Inicia um fluxo pelo Trigger
   */
  static async startFlow(
    flow: FlowJson,
    context: Record<string, any> = {},
  ): Promise<void> {
    const nodes = FlowParser.getNodes(flow);

    const trigger = nodes.find((node) => node.data.type === "trigger");

    if (!trigger) {
      throw new Error("Trigger não encontrado");
    }

    await this.executeNode(flow, trigger.id.toString(), context);
  }

  /**
   * Continua uma execução pausada
   */
  static async continueFlow(
    flow: FlowJson,
    nodeId: string,
    context: Record<string, any> = {},
  ): Promise<void> {
    await this.executeNode(flow, nodeId, context);
  }

  /**
   * Executa um nó e segue para os próximos
   */
  private static async executeNode(
    flow: FlowJson,
    nodeId: string,
    context: Record<string, any>,
  ): Promise<void> {
    const node = FlowParser.findNode(flow, nodeId);

    if (!node) {
      throw new Error(`Node ${nodeId} não encontrado`);
    }

    const executor = nodeRegistry[node.data.type as keyof typeof nodeRegistry];

    if (!executor) {
      throw new Error(`Executor não encontrado para o node ${node.data.type}`);
    }

    console.log(`[FLOW] Executando node ${node.id} (${node.data.type})`);

    const result = await executor.execute(node, context);

    /**
     * DelayNode ou WaitResponseNode
     * podem retornar null para interromper
     */
    if (result === null) {
      return;
    }

    const nextNodes = FlowParser.getNextNodes(node);

    if (!nextNodes.length) {
      console.log(`[FLOW] Fluxo finalizado no node ${node.id}`);

      return;
    }

    for (const nextNodeId of nextNodes) {
      await this.executeNode(flow, nextNodeId, result);
    }
  }
}
