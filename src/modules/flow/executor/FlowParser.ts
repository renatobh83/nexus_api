import { FlowJson, FlowNode } from "../types.js";

export class FlowParser {
  static getNodes(flow: FlowJson): FlowNode[] {
    return Object.values(flow.drawflow.Home.data);
  }

  static findNode(
    flow: FlowJson,
    nodeId: string | number,
  ): FlowNode | undefined {
    return flow.drawflow.Home.data[String(nodeId)];
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
