/** Converte um parâmetro de rota em um ID positivo somente quando ele é inteiro e seguro. */
export function parseChannelId(value: unknown): number | undefined {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return undefined;

  const channelId = Number(value);
  return Number.isSafeInteger(channelId) && channelId > 0
    ? channelId
    : undefined;
}
