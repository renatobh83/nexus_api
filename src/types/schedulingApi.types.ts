import { Ticket } from "@prisma/client";

export interface ConfirmacaoJobData {
  contatoSend: string;
  response: string;
  status: "confirm" | "cancel" | "invalid";
  ticket: Ticket;
}

export enum STATUS_CONFIRMACAO {
  RESPONDIDO = "RESPONDIDO",
  CONFIRMADO = "CONFIRMADO",
  CANCELADO = "CANCELADO",
  ERROR = "ERRO NO PROCESSO DE CONFIRMAÇÂO",
  SEM_RESPOSTA = "SEM RESPOSTA",
  ENVIADA = "ENVIADA",
}
