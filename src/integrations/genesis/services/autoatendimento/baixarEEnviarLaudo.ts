import { ExternalApiClient } from "../../client/ExternalApiClient.js";

type ofDocumento = {
    cd_paciente: string,
    cd_exame: string,
    token: string
}
export async function baixarEEnviarLaudo(
    client: ExternalApiClient,
    documento: ofDocumento
): Promise<any> {
    const url = `dwrisold/www/doLaudoDownload?cd_exame=${documento.cd_exame}&cd_paciente=${documento.cd_paciente}&cd_funcionario=1&sn_entrega=false`;


    return client.getBinary(url,
        {   stripSe1: true, tokenPaciente: documento.token  },
    );
}