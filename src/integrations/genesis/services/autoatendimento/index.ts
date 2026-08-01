import { IntegracaoService } from '../../../../modules/externals/integrationConfig.service.js';
import { getExternalApiClient } from '../../client/index.js';
import { buscarCadastro as _buscarCadastro } from './buscarCadastro.js';
import { buscarAtendimento as _buscarAtendimento } from './buscarAtendimento.js';
import { baixarEEnviarLaudo as _baixarEEnvarLaudo } from './baixarEEnviarLaudo.js';


// ─── INICIALIZAÇÃO ASSÍNCRONA ───
let client: any = null;
let integracao: any = null;

export async function initializeAutoatendimento() {
  if (!client) {
    const integracaoService = new IntegracaoService();
    integracao = await integracaoService.getIntegrationConfig("autoatendimento", "2");
    client = getExternalApiClient(integracao);
  }
  return client;
}

// ─── FUNÇÕES QUE GARANTEM QUE O CLIENT ESTÁ INICIALIZADO ───
async function getClient() {
  if (!client) {
    await initializeAutoatendimento();
  }
  return client;
}

// ─── EXPORTA AS FUNÇÕES ───
export const buscarCadastro = async (documento: any) => {
  const client = await getClient();
  return _buscarCadastro(client, documento);
};

export const buscarAtendimento = async (documento: any) => {
  const client = await getClient();
  return _buscarAtendimento(client, documento);
};

export const baixarLaudo = async (documento: any) => {
  const client = await getClient();
  return _baixarEEnvarLaudo(client, documento);
};

