export interface FlowNode {
  id: number;
  name: string;
  data: {
    type: string;
    props?: {
      k: string;
      v: string;
    }[];
  };

  outputs: Record<
    string,
    {
      connections: {
        node: string;
      }[];
    }
  >;
}
export interface FlowModule {
  data: Record<string, FlowNode>;
}
export interface FlowJson {
  drawflow: Record<string, FlowModule>;
}

export interface ExecutionContext {
  [key: string]: any;
}

export interface FlowContext {
  executionId: string;

  ticket: any;

  vars: Record<string, any>;

  output?: {
    type:
      | "message"
      | "json"
      | "array"
      | "number"
      | "boolean"
      | "file";

    data: any;
  };
}