import { FlowsService } from "../flow.service.js";

const conversationHistories = new Map<
  string,
  { role: string; content: string }[]
>();

export function clearAiHistory(ticketId: string | number) {
  conversationHistories.delete(String(ticketId));
}
const flowService = new FlowsService();
export const ProcessAiNode = {
  async execute(node: any, context: any) {
    const model = node.data.props.find(
      (p: { k: string }) => p.k === "model",
    )?.v;
    const promptData = node.data.props.find(
      (p: { k: string }) => p.k === "Prompt",
    )?.v;
    const maxHistory = node.data.props.find(
      (p: { k: string }) => p.k === "maxHistory",
    )?.v;
    const temperature = node.data.props.find(
      (p: { k: string }) => p.k === "temperature",
    )?.v;
    const maxTokens = node.data.props.find(
      (p: { k: string }) => p.k === "maxTokens",
    )?.v;

    const prompt = context.mensagem;
    const promptAgent = await flowService.findAiPrompt(promptData);

    const ticketId = String(context.ticketId ?? context.ticket_id ?? "default");

    if (!conversationHistories.has(ticketId)) {
      conversationHistories.set(ticketId, []);
    }
    const history = conversationHistories.get(ticketId)!;

    history.push({ role: "user", content: prompt });

    const systemMessage = {
      role: "system",
      content: promptAgent?.content || "default",
    };

    const messages = [
      systemMessage,
      ...sanitizeHistory(history.slice(-maxHistory)),
    ];

    const response = await fetchWithRetry(
      ticketId,
      messages,
      history,
      systemMessage,
      1,
      model,
      temperature,
      maxTokens,
    );

    const data = await response.json();
    const usage = data.usage;
    const choice = data.choices[0];
    const finishReason = choice.finish_reason;
    if (finishReason === "length") {
      console.warn(
        `[AI][ticket=${ticketId}] Resposta truncada por limite de tokens.`,
      );
      // não envia mensagem em branco: usa fallback e não avança o fluxo
      return {
        ...context,
        output: {
          type: "mensagem",
          data: "🤖 Só um momento, deixa eu confirmar isso de novo...",
        },
      };
    }
    const raw = choice.message.content as string;
    console.log({
      raw,
      usage,
    });
    const semThought = stripThought(raw);
    const dadosExtraidos = extractDados(semThought); // só então procura ###DADOS###
    const clean = extractFinalResponse(semThought); // e só então monta o texto final

    const respostaFinal =
      clean && clean.trim().length > 0
        ? clean
        : "Desculpe, pode repetir a última informação?"; // fallback nunca-vazio

    history.push({ role: "assistant", content: clean });
    const escopo = promptData;
    const chaveDados = `dados_${escopo}`;
    const chaveEtapa = `etapaConcluida_${escopo}`;
    const dadosAcumulados = {
      ...(context[chaveDados] ?? {}),
      ...Object.fromEntries(
        Object.entries(dadosExtraidos ?? {}).filter(
          ([k, v]) => k !== "concluido" && v != null,
        ),
      ),
    };

    return {
      ...context,
      [chaveDados]: dadosAcumulados,
      [chaveEtapa]: dadosExtraidos?.concluido === true,
      output: {
        type: "mensagem",
        data: `🤖 ${respostaFinal}`,
      },
    };
  },

  clearHistory(ticketId: string | number) {
    conversationHistories.delete(String(ticketId));
  },
};

async function fetchWithRetry(
  ticketId: string,
  messages: { role: string; content: string }[],
  history: { role: string; content: string }[],
  systemMessage: { role: string; content: string },
  attempt = 1,
  model = "gemma-4-31b-it",
  temperature = 0.7,
  tokens = 500,
): Promise<Response> {
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: `models/${model}`,
        messages,
        temperature,
        max_tokens: tokens,
      }),
    },
  );

  if (!response.ok) {
    const err = await response.text();

    if (attempt === 1) {
      console.warn(
        `[AI][ticket=${ticketId}] Erro ${response.status} tentativa ${attempt}, retentando sem histórico...`,
      );

      // Limpa histórico corrompido mantendo só a última mensagem do usuário
      const lastUserMsg = history.filter((m) => m.role === "user").at(-1)!;
      history.splice(0, history.length);
      history.push(lastUserMsg);

      // Reenvia só system + última mensagem
      return fetchWithRetry(
        ticketId,
        [systemMessage, lastUserMsg],
        history,
        systemMessage,
        2,
        model,
        temperature,
        tokens,
      );
    }

    console.error(`[AI][ticket=${ticketId}] Erro ${response.status}:`, err);
    throw new Error(`LLM error ${response.status}: ${err}`);
  }

  return response;
}

function sanitizeHistory(
  messages: { role: string; content: string }[],
): { role: string; content: string }[] {
  return messages.filter((msg, i, arr) => {
    if (i === 0) return true;
    return msg.role !== arr[i - 1].role;
  });
}

function stripThought(raw: string): string {
  return raw
    .replace(/<thought>[\s\S]*?<\/thought>/gi, "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<\/?think>/gi, "")
    .replace(/<\/?thought>/gi, "");
}

function extractDados(semThought: string): Record<string, any> | null {
  const match = semThought.match(/###DADOS###\s*(\{[\s\S]*\})/);
  if (!match) return null;

  try {
    return JSON.parse(match[1]);
  } catch (err) {
    console.error("Falha ao parsear ###DADOS###:", match[1]);
    console.error("Erro real:", err);
    return null;
  }
}

function extractFinalResponse(semThought: string): string {
  return semThought.replace(/###DADOS###\s*\{[\s\S]*\}/, "").trim();
}
