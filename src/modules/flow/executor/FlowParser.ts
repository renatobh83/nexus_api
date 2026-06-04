import { FlowJson, FlowNode } from "../types.js";

export class FlowParser {
  static getNodes(
    flow: FlowJson,
    moduleName: string
  ): FlowNode[] {

    const module =
      flow.drawflow[moduleName];

    if (!module) {
      throw new Error(
        `Módulo ${moduleName} não encontrado`
      );
    }

    return Object.values(module.data);
  }

  static findNode(
    flow: FlowJson,
    nodeId: string | number,
    moduleName: string,
  ) {
    return flow.drawflow[moduleName]
      ?.data[String(nodeId)];
  }
  static getNextNodes(node: FlowNode) {
    const result: string[] = [];

    Object.values(node.outputs || {}).forEach((output) => {
      output.connections.forEach((conn) => {
        result.push(conn.node);
      });
    });

    return result;
  }
}