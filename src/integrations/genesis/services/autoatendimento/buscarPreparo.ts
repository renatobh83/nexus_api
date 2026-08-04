import { ExternalApiClient } from "../../client/ExternalApiClient.js";

type ofDocumento = {
    cd_procedimento: string,
    token: string
}
export async function buscarPreparo(
    client: ExternalApiClient,
    documento: ofDocumento
): Promise<any> {
    try {

        const url = `dwrisold/se1/doProcedimentoPreparo`;
        const body = new URLSearchParams();
        body.append("cd_procedimento", String(documento.cd_procedimento));


        return client.post(url,
            body,
            { stripSe1: true, tokenPaciente: documento.token, formEncoded: true },
        );
    } catch (error) {
        console.error(error)
        throw error;
    }
}