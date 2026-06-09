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

    const raw = data.choices[0].message.content as string;
    console.log({
      raw,
      usage,
    });
    const clean = extractFinalResponse(raw);

    history.push({ role: "assistant", content: clean });

    return {
      ...context,
      output: {
        type: "mensagem",
        data: clean,
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

function extractFinalResponse(raw: string): string {
  let cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, "");
  cleaned = cleaned.replace(/<thought>[\s\S]*?<\/thought>/gi, "");
  cleaned = cleaned.replace(/<\/think>/gi, "");
  cleaned = cleaned.replace(/<\/thought>/gi, "");

  const lines = cleaned.split("\n");
  let lastBulletIndex = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim().startsWith("*")) {
      lastBulletIndex = i;
      break;
    }
  }

  if (lastBulletIndex !== -1) {
    const lastBulletLine = lines[lastBulletIndex];

    const inlineMatch = lastBulletLine.match(/\)\s*([^)]+)$/);
    if (inlineMatch) {
      return inlineMatch[1].trim();
    }

    const afterBullets = lines
      .slice(lastBulletIndex + 1)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .join("\n");

    if (afterBullets) return afterBullets;
  }

  return cleaned.trim();
}
