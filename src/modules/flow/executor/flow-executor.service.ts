import { FlowJson } from "../types.js";
import { FlowParser } from "./FlowParser.js";
import { nodeRegistry } from "../nodes/index.js";
import { FlowsService } from "../flow.service.js";
import {
  consumeFlowExecutionStep,
  createFlowExecutionState,
  getFlowExecutionLimits,
  persistFlowRuntimeMetadata,
  removeFlowRuntimeMetadata,
  FlowExecutionLimits,
  FlowExecutionState,
} from "./flow-execution.security.js";

const flowExecutionService = new FlowsService();

export class FlowExecutorService {
  /**
   * Inicia um fluxo pelo Trigger e cria um orçamento único para toda a cadeia.
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

    const limits = getFlowExecutionLimits();
    const state = createFlowExecutionState(context);

    await this.executeNode(
      flow,
      trigger.id.toString(),
      removeFlowRuntimeMetadata(context),
      moduleName,
      state,
      0,
      limits,
    );
  }

  /**
   * Continua uma execução pausada reutilizando o contador persistido no banco.
   */
  static async continueFlow(
    flow: FlowJson,
    nodeId: string,
    context: Record<string, any> = {},
    moduleName: string,
  ): Promise<void> {
    const limits = getFlowExecutionLimits();
    const state = createFlowExecutionState(context);

    await this.executeNode(
      flow,
      nodeId,
      removeFlowRuntimeMetadata(context),
      moduleName,
      state,
      0,
      limits,
    );
  }

  /**
   * Executa um nó, encaminha seus resultados e aplica limites compartilhados a
   * todos os ramos do grafo, inclusive quando existem ciclos de conexão.
   */
  private static async executeNode(
    flow: FlowJson,
    nodeId: string,
    context: Record<string, any>,
    moduleName: string,
    state: FlowExecutionState,
    depth: number,
    limits: FlowExecutionLimits,
  ): Promise<void> {
    const node = FlowParser.findNode(flow, nodeId, moduleName);

    if (!node) {
      throw new Error(`Node ${nodeId} não encontrado`);
    }

    consumeFlowExecutionStep(state, nodeId, depth, limits);

    const executor = nodeRegistry[node.data.type as keyof typeof nodeRegistry];

    if (!executor) {
      throw new Error(`Executor não encontrado para o node ${node.data.type}`);
    }

    const executionContext = removeFlowRuntimeMetadata(context);
    console.log(`[FLOW] Executando node ${node.id} (${node.data.type})`);

    const result = await executor.execute(node, executionContext);

    if (result?.__waitResponse) {
      const { __waitResponse, ...contextToSave } = result;
      const nextNodes = FlowParser.getNextNodes(node);

      await flowExecutionService.updoateFlowExecution(context.executionId, {
        status: "waiting_response",
        currentNodeId: nextNodes[0],
        context: persistFlowRuntimeMetadata(contextToSave, state),
      });

      return;
    }

    /**
     * DelayNode ou WaitResponseNode podem retornar null para interromper.
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
          persistFlowRuntimeMetadata(cleanResult, state),
          moduleName,
          state,
          depth + 1,
          limits,
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
      await this.executeNode(
        flow,
        nextNodeId.toString(),
        persistFlowRuntimeMetadata(result, state),
        moduleName,
        state,
        depth + 1,
        limits,
      );
    }
  }
}
