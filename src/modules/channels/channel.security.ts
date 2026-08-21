import type { Channel } from "@prisma/client";

export type PublicChannel = Omit<
  Channel,
  | "session"
  | "qrcode"
  | "pairingCode"
  | "tokenTelegram"
  | "phone"
  | "wabaBSP"
  | "tokenAPI"
  | "tokenHook"
>;

/** Remove credenciais e dados de sessão antes de devolver um canal pela API. */
export function toPublicChannel(channel: Channel): PublicChannel {
  const {
    session,
    qrcode,
    pairingCode,
    tokenTelegram,
    phone,
    wabaBSP,
    tokenAPI,
    tokenHook,
    ...publicChannel
  } = channel;

  return publicChannel;
}

/** Converte o identificador da rota sem aceitar prefixos ou valores não positivos. */
export function parseChannelId(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}
