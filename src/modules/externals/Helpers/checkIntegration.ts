import { checkBot } from "../api/index.js";
import { IntegracaoService } from "../integrationConfig.service.js";

interface IcheckIntegration {
  channelId: string;
  clientId: string;
  integrationName: string;
  body: any;
}
const integracaoService = new IntegracaoService();
export const checkIntegration = async (input: IcheckIntegration) => {
  try {
    const config = await integracaoService.getIntegrationConfig(
      input.integrationName,
      input.clientId,
    );

    if (!config || !config.isActive) {
      throw new Error("Integração não existe ou não esta ativa!");
    }

    if (input.integrationName === "scheduling_api") {
      await checkBot(input);
    } else {
      return;
    }
  } catch (error) {
    throw new Error(`${error}`);
  }
};
