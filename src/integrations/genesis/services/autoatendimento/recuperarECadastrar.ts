import { ExternalApiClient } from "../../client/ExternalApiClient.js";

type ofDocumento = {
  dtNascimento: string
  email: string
}
export async function recuperarSenha(
  client: ExternalApiClient,
  documento: ofDocumento
): Promise<any> {
  const url = "dwrisold/se1/doPacientePassword";

  const body = new URLSearchParams();
  body.append("ds_email", documento.email);
  body.append("dt_nascimento", documento.dtNascimento);


  return client.post(url,
    body,
    // { formEncoded: true , tokenPaciente: documento.token, stripSe1: true},
  );
}

export async function cadastrarSenha(
  client: ExternalApiClient,
  documento: any
): Promise<any> {
  try {
    const url = "doPacienteTabela";

    const json = JSON.stringify(documento);

    const base64 = Buffer.from(json).toString("base64");
    const body = new FormData();
    body.append("js_paciente", base64);
    body.append("cd_operacao", "1");

    return client.post(url,
      body,
      { formEncoded: true }
    );
  } catch (error) {
    console.error(error)
    throw error;
  }

}