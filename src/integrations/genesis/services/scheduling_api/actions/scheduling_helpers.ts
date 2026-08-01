import { promisify } from "node:util";

export const delay = promisify(setTimeout);

export const DELAYS = {
  BEFORE_CLOSING: 3000,
} as const;

export function isBase64Meaningful(base64: string, minBytes = 200): boolean {
  return Buffer.from(base64, "base64").length >= minBytes;
}

export const MENSAGENS = {
  INVALIDA:
    "Resposta inválida. Por favor, responda apenas com uma das opções da lista.",
  CONFIRMADO_INTRO: `Seu agendamento foi confirmado com sucesso!\n\n🏥 Para garantir que tudo ocorra bem, confira as instruções de preparo no arquivo anexado.`,
  SEM_PREPARO:
    "Identificamos que um dos seus agendamentos não possui instruções de preparo.",
  CANCELADO:
    "Seu exame foi cancelado com sucesso. Se precisar reagendar, entre em contato com nossa central de atendimento.",
  ENCERRAMENTO: `O processo de confirmação foi concluído com sucesso.\nCaso tenha alguma dúvida ou precise de mais informações, entre em contato com a nossa central de atendimento.\nEstamos à disposição para ajudá-lo!`,
  ERRO_CONFIRMACAO: `Infelizamente não conseguimos confirmar o exame selecionado.\nFavor entrar em contato com a nossa central para confirmar o seu exame, estamos à disposição.`,
} as const;
