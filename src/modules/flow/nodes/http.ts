import {
  buildFlowHttpUrl,
  FlowHttpRequestLimitError,
  FlowHttpResponseLimitError,
  FlowHttpResponseParseError,
  getFlowHttpLimits,
  getFlowServiceToken,
  normalizeFlowHttpMethod,
  parseFlowHttpResponse,
  readFlowHttpResponseWithLimit,
  serializeFlowHttpBody,
} from "./flowHttp.security.js";

export const HttpNode = {
  async execute(node: any, context: any) {
    const props = Array.isArray(node?.data?.props) ? node.data.props : [];
    const getProp = (key: string): unknown =>
      props.find((prop: any) => prop?.k === key)?.v;

    let metodo = "GET";

    try {
      metodo = normalizeFlowHttpMethod(getProp("Método") || "GET");
      const urlProp = getProp("URL");
      const parametroPath = getProp("Parâmetros da Rota");
      const bodyTemplate = getProp("Body");
      const salvarEm = getProp("Salvar em");
      const responseKey =
        typeof salvarEm === "string" && salvarEm.trim()
          ? salvarEm.trim()
          : "httpResponse";
      const limits = getFlowHttpLimits();
      const serviceToken = getFlowServiceToken();
      const paramValue = parametroPath
        ? getNestedValue(context, parametroPath)
        : undefined;
      const url = buildFlowHttpUrl(
        process.env.BACKEND_URL,
        resolvePath(urlProp, paramValue),
      );
      const body = resolveBodyTemplate(bodyTemplate, context);
      const options: RequestInit = {
        method: metodo,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceToken}`,
        },
        redirect: "error",
      };

      if (["POST", "PUT", "PATCH", "DELETE"].includes(metodo) && body !== undefined) {
        options.body = serializeFlowHttpBody(body, limits.maxRequestBytes);
      }

      const controller = new AbortController();
      options.signal = controller.signal;
      const timeout = setTimeout(() => controller.abort(), limits.timeoutMs);

      try {
        const response = await fetch(url, options);
        const contentType = response.headers.get("content-type") || "";
        const responseBody = await readFlowHttpResponseWithLimit(
          response,
          limits.maxResponseBytes,
        );
        const data = parseFlowHttpResponse(responseBody, contentType);

        if (!response.ok) {
          console.error("[HttpNode] upstream request failed", {
            method: metodo,
            status: response.status,
          });
          return {
            ...context,
            httpStatus: response.status,
            httpSuccess: false,
            httpError: "UPSTREAM_ERROR",
            route: "output_1",
          };
        }

        return {
          ...context,
          [responseKey]: data,
          httpStatus: response.status,
          response: data,
          httpSuccess: true,
          route: "output_1",
        };
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      const errorCode = getHttpNodeErrorCode(error);
      console.error("[HttpNode] request failed", {
        method: metodo,
        error: errorCode,
      });
      return {
        ...context,
        httpStatus: null,
        httpSuccess: false,
        httpError: errorCode,
      };
    }
  },
};

/**
 * Resolve o parâmetro de rota sem permitir que o valor do contexto introduza
 * separadores ou uma autoridade externa no destino final.
 */
function resolvePath(urlProp: unknown, paramValue: unknown): string {
  const path = normalizePath(urlProp);
  if (paramValue === undefined || paramValue === null) {
    if (/:\w+/.test(path)) {
      throw new Error("Parâmetro de rota do node HTTP não encontrado");
    }
    return path;
  }

  if (
    typeof paramValue !== "string" &&
    typeof paramValue !== "number" &&
    typeof paramValue !== "boolean"
  ) {
    throw new Error("Parâmetro de rota do node HTTP inválido");
  }

  const encodedValue = encodeURIComponent(String(paramValue));
  return path.includes(":")
    ? path.replace(/:\w+/, encodedValue)
    : `${path}/${encodedValue}`;
}

/**
 * Valida a presença textual do caminho antes que ele seja normalizado pelo
 * helper de URL-base e enviado ao backend confiável.
 */
function normalizePath(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("URL do node HTTP não configurada");
  }
  return value.trim();
}

/**
 * Resolve o body recursivamente, substituindo somente placeholders inteiros e
 * mantendo valores literais sem execução de expressões.
 */
function resolveBodyTemplate(template: any, context: any): any {
  if (!template) return undefined;

  let obj = template;
  if (typeof template === "string") {
    try {
      obj = JSON.parse(template);
    } catch {
      return template;
    }
  }
  return resolveDeep(obj, context);
}

/**
 * Caminha por objetos e arrays para resolver referências do contexto sem
 * alterar o formato do body já aceito pelos flows existentes.
 */
function resolveDeep(obj: any, context: any): any {
  if (typeof obj === "string") {
    const match = obj.match(/^\{\{(.+)\}\}$/);
    if (match) return getNestedValue(context, match[1].trim());
    return obj;
  }
  if (Array.isArray(obj)) return obj.map((item) => resolveDeep(item, context));
  if (obj && typeof obj === "object") {
    const resolved: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      resolved[key] = resolveDeep(value, context);
    }
    return resolved;
  }
  return obj;
}

/**
 * Lê propriedades aninhadas do contexto e retorna undefined para caminhos
 * ausentes, preservando o comportamento anterior do node.
 */
function getNestedValue(obj: any, path: unknown): unknown {
  if (typeof path !== "string" || !path.trim()) return undefined;
  return path.split(".").reduce((acc, key) => acc?.[key], obj);
}

/**
 * Converte falhas do node em códigos estáveis, sem propagar tokens, URLs ou
 * corpos retornados pelo serviço chamado.
 */
function getHttpNodeErrorCode(error: unknown): string {
  if (error instanceof FlowHttpRequestLimitError) return error.code;
  if (error instanceof FlowHttpResponseLimitError) return error.code;
  if (error instanceof FlowHttpResponseParseError) return error.code;
  if (error instanceof Error && error.name === "AbortError") {
    return "FLOW_HTTP_TIMEOUT";
  }
  return "FLOW_HTTP_REQUEST_FAILED";
}
