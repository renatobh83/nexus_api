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
  mensagem: {
    body: string;
    imagem: string;
  };
};

export type BoletimNoticiasNotification = ExternalNotificationBody & {
  event: "boletim.noticiasEventos";
  mensagem: {
    weather: any;
    alerts: { alerts: any[] };
    brasil: any[];
    mundo: any[];
    tecnologia: any[];
    city: any;
    date: any;
    timezone: any;
    generated_at: string | number | Date;
  };
};
