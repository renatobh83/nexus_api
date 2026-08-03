import { ExternalApiClient } from "../../client/ExternalApiClient.js";

type ofDocumento= {
  token:string
  cd_atendimento: string
}
export async function cancelarAgendamento(
  client: ExternalApiClient,
  documento: ofDocumento
): Promise<any> {
  const url = "dwrisold/se1/doAgendaCancelar";
  
  const body = new URLSearchParams();
    body.append("cd_atendimento", documento.cd_atendimento);
    

  return client.post(url,
    body,
    { formEncoded: true , tokenPaciente: documento.token, stripSe1: true},
  );
}