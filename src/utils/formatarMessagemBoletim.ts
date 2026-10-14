export function formatarMensagemBoletim(d: {
  weather: any;
  alerts: { alerts: any[] };
  brasil: any[];
  mundo: any[];
  tecnologia: any[];
  city: any;
  date: any;
  timezone: any;
  generated_at: string | number | Date;
}) {
  const w = d.weather;
  const alerts = d.alerts.alerts.length
    ? d.alerts.alerts.join("\n")
    : "Nenhum alerta ativo";

  const linhasBrasil = d.brasil
    .map((n) => `• *${n.title}*\n  ${n.source} — ${n.published}`)
    .join("\n\n");
  const linhasMundo = d.mundo
    .map((n) => `• *${n.title}*\n  ${n.source} — ${n.published}`)
    .join("\n\n");
  const linhasTech = d.tecnologia
    .map((n) => `• *${n.title}*\n  ${n.source} — ${n.published}`)
    .join("\n\n");

  return `🌤️ *PREVISÃO DO TEMPO — ${d.city}*
📅 ${d.date} (${d.timezone})

🌡️ Mín: ${w.min_c}°C | Máx: ${w.max_c}°C
🌧️ Chuva: ${w.rain_probability_percent}% (${w.rain_mm} mm)
💨 Rajadas: ${w.max_wind_gust_kmh} km/h

⚠️ *Alertas:* ${alerts}

━━━━━━━━━━━━━━━
🇧🇷 *BRASIL*
${linhasBrasil}

━━━━━━━━━━━━━━━
🌎 *MUNDO*
${linhasMundo}

━━━━━━━━━━━━━━━
💻 *TECNOLOGIA*
${linhasTech}

━━━━━━━━━━━━━━━
_Fontes: Open-Meteo, INMET, Google News_
_Gerado em: ${new Date(d.generated_at).toLocaleString("pt-BR")}_`;
}
