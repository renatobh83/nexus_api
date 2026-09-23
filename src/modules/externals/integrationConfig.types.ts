export type NotificationResult = {
  success: boolean;
  error?: string;
};
export type ChannelParams = {
  channelId: string;
};

export type ExternalNotificationBody = {
  event: string;
  occurredAt: string;
  recipient: string;
  [key: string]: unknown;
};

export type MarketAlert = {
  ticker: string;
  title: string;
  body: string;
  movementPercent: number;
};

export type MarketAlertNotification = ExternalNotificationBody & {
  event: "market.alert.created";
  alert: MarketAlert;
};

export type MercadoLivreNotification = ExternalNotificationBody & {
  event: "ofertas.mercado.livre";
  mensagem: string;
};
