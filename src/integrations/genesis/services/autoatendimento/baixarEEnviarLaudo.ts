import { ExternalApiClient } from "../../client/ExternalApiClient.js";

type ofDocumento = {
    cd_paciente: string,
    cd_exame: string
}
export async function baixarEEnviarLaudo(
    client: ExternalApiClient,
    documento: ofDocumento
): Promise<any> {
    const url = `/www/doLaudoDownload?cd_exame=${documento.cd_exame}&cd_paciente=${documento.cd_paciente}&cd_funcionario=1&sn_entrega=false`;
    const body = new URLSearchParams();
    body.append("cd_exame", String(documento.cd_exame));

    return client.post(url,
        body,
        { formEncoded: true,  stripSe1: true  },
    );
}