import https from "https";
import axios from "axios";

const agent = new https.Agent({
  rejectUnauthorized: false, // IGNORA erros de certificado SSL
});
export async function getApiInstance(integracao: any) {
  let token = integracao.config_json.token;
  let url = "";
  try {
    if (!token || !token.trim() || isTokenExpired(token)) {
      const { user, baseUrl, password } = integracao.config_json;
      url = `${baseUrl}doFuncionarioLogin?id=${user}&pw=${encodeURIComponent(
        password,
      )}`;

      const response = await axios.get(url, {
        httpsAgent: agent,
      });
      token = response.data[0].ds_token;
      // Atualiza o objeto config_json com o novo token
      const updatedConfigJson = {
        ...integracao.config_json,
        tokenJwt: token,
      };

      await getFastifyApp().services.integracaoService.updateIntegracao({
        id: integracao.id,
        config_json: updatedConfigJson,
      });
    } else {
      token = integracao.config_json.tokenJwt; // Se for JWT, usa o token direto
    }

    return axios.create({
      baseURL: integracao.config_json.baseUrl,
      httpsAgent: agent,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error: any) {
    console.error("Erro ao obter token:", url);
    throw error;
  }
}
