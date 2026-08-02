import { ExternalApiClient } from "../../client/ExternalApiClient.js";

type ofDocumento = {
    cd_paciente: string,
    token: string
}
export async function buscarAgendamentos(
    client: ExternalApiClient,
    documento: ofDocumento
): Promise<any> {
    const url = "dwrisold/se1/doListaAgendamento";

    const body = new URLSearchParams();
    body.append("cd_paciente", documento.cd_paciente);

    return client.post(url, body,
        { stripSe1: true, tokenPaciente: documento.token, formEncoded: true },
    );
}
