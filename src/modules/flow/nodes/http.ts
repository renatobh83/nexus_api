export const HttpNode = {
  async execute(node: any, context: any) {
    const BASE_URL = process.env.BASE_URL;

    const metodo = (
      node.data.props.find((p: any) => p.k === "Método")?.v || "GET"
    ).toUpperCase();

    const urlProp = node.data.props.find((p: any) => p.k === "URL")?.v;
    const parametroPath = node.data.props.find(
      (p: any) => p.k === "Parâmetros da Rota",
    )?.v;
    const bodyTemplate = node.data.props.find((p: any) => p.k === "Body")?.v;
    const salvarEm =
      node.data.props.find((p: any) => p.k === "Salvar em")?.v ||
      "httpResponse";

    // resolve parâmetro de rota (ex: pacienteId) a partir do context
    const paramValue = parametroPath
      ? getNestedValue(context, parametroPath)
      : undefined;

    // monta a URL final, substituindo :param se existir no template da URL
    let url = `${BASE_URL}/${urlProp}`;
    if (paramValue !== undefined) {
      url = url.replace(/:(\w+)/, String(paramValue));
      // se a URL não tiver placeholder :algo, mas você quiser appendar o valor no final:
      if (!urlProp.includes(":")) {
        url = `${BASE_URL}/${urlProp}/${paramValue}`;
      }
    }

    // monta o body substituindo referências {{campo}} pelo valor real do context
    const body = resolveBodyTemplate(bodyTemplate, context);

    console.log(`[HttpNode] ${metodo} ${url}`, body ? { body } : "");

    try {
      const options: RequestInit = {
        method: metodo,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.FLOW_SERVICE_TOKEN}`,
        },
      };

      if (["POST", "PUT", "PATCH"].includes(metodo) && body) {
        options.body = JSON.stringify(body);
      }
      const response = await fetch(url, options);
      const contentType = response.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

      if (!response.ok) {
        console.error(`[HttpNode] Erro ${response.status}:`, data);
        return {
          ...context,
          httpStatus: response.status,
          httpSuccess: false,
          route: "output_1",
        };
      }

      return {
        ...context,
        httpStatus: response.status,
        response: data,
        httpSuccess: true,
        route: "output_1",
      };
    } catch (err) {
      console.error(`[HttpNode] Falha na requisição:`, err);
      return {
        ...context,
        httpStatus: null,
        httpSuccess: false,
      };
    }
  },
};

function resolveBodyTemplate(template: any, context: any): any {
  if (!template) return undefined;

  // se vier como string JSON, faz parse antes de resolver placeholders
  let obj = template;
  if (typeof template === "string") {
    try {
      obj = JSON.parse(template);
    } catch {
      return template; // não é JSON, devolve como veio
    }
  }

  return resolveDeep(obj, context);
}

function resolveDeep(obj: any, context: any): any {
  if (typeof obj === "string") {
    const match = obj.match(/^\{\{(.+)\}\}$/);
    if (match) {
      return getNestedValue(context, match[1].trim());
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => resolveDeep(item, context));
  }

  if (obj && typeof obj === "object") {
    const resolved: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      resolved[key] = resolveDeep(value, context);
    }
    return resolved;
  }

  return obj;
}

function getNestedValue(obj: any, path: string) {
  return path.split(".").reduce((acc, key) => acc?.[key], obj);
}
