import { ExternalApiClient } from "../../client/ExternalApiClient.js";

type ofDocumento = {
    cd_paciente: string,
    ds_token: string
}
export async function buscarAtendimento(
    client: ExternalApiClient,
    documento: ofDocumento
): Promise<any> {

    const url = `/doListaAtendimento`;
    const body = new URLSearchParams();
    body.append("cd_paciente", String(documento.cd_paciente));
    body.append("token", documento.ds_token);



    return client.post(url,
        body,
        { formEncoded: true },
    );
}