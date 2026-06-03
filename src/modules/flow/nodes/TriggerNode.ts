export const TriggerNode = {
  async execute(node: any, context: any) {
    console.log("Trigger executado");

    return {
      ...context,
      triggeredAt: new Date(),
    };
  },
};
