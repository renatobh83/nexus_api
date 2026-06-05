export const WaitResponseNode = {
  async execute(node: any, context: any) {
    return {
      ...context,
      __waitResponse: true
    };
  }
};