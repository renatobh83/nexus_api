import { ExternalApiClient } from "../../client/ExternalApiClient.js";

type ofDocumento= {
  cpf: string,
  senha: string
}
export async function buscarCadastro(
  client: ExternalApiClient,
  documento: ofDocumento
): Promise<any> {
  const url = "doPacienteLogin";
  const body = new URLSearchParams();
    body.append("id", documento.cpf);
    body.append("pw", documento.senha);

  return client.post(url,
    body,
    { formEncoded: true },
  );
}