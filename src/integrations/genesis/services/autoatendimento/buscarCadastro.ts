import { ExternalApiClient } from "../../client/ExternalApiClient.js";

type ofDocumento = {
  cpf: string,
  senha: string
}

export async function buscarCadastro(
  client: ExternalApiClient,
  documento: ofDocumento
): Promise<any> {
  const url = "dwrisold/se1/doPacienteLogin";

  const body = new URLSearchParams();
  body.append("id", documento.cpf);
  body.append("pw", documento.senha);

  try {
    return await client.post(url, body, { formEncoded: true, stripSe1: true });
  } catch (error: any) {
    // Verifica se é o erro específico de senha inválida
    if (error.message && error.message.includes('Senha inválida !')) {
      // Tratamento específico para senha inválida
      throw new Error('Credenciais inválidas. Verifique seu CPF e senha.');
    }
    console.error(error)
    throw error;
  }
}