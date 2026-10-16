type Noticia = {
  title: string;
  why_it_matters?: string;
  connection?: string;
  status?: string;
  source: string;
  published: string;
};

type Boletim = {
  weather: any;
  alerts: { alerts: any[]; status?: string };
  brasil: Noticia[];
  mundo: Noticia[];
  tecnologia: Noticia[];
  city: any;
  date: any;
  timezone: any;
  generated_at: string | number | Date;
  opening?: string;
  closing?: string;
  ai_fallback?: boolean;
};

export function formatarMensagemBoletim(d: Boletim) {
  const w = d.weather;

  // Alertas: agora respeita o status "unavailable"
  const alerts =
    d.alerts?.status === "unavailable"
      ? "Não foi possível confirmar os avisos oficiais."
      : d.alerts?.alerts?.length
        ? d.alerts.alerts.join("\n")
        : "Nenhum alerta ativo";

  const semIA = d.ai_fallback === true;

  const renderNoticia = (n: Noticia) => {
    const linhas = [`• *${n.title}*`];

    // Só inclui análise se a IA rodou e o texto existe
    if (!semIA && n.why_it_matters?.trim()) {
      linhas.push(`  🧠 ${n.why_it_matters.trim()}`);
    }
    if (!semIA && n.connection?.trim()) {
      linhas.push(`  🔗 ${n.connection.trim()}`);
    }

    const meta = [n.source, n.published].filter(Boolean).join(" — ");
    if (meta) linhas.push(`  ${meta}`);
    // if (n.url) linhas.push(`  🔗 ${n.url}`);

    return linhas.join("\n");
  };

  const bloco = (titulo: string, itens: Noticia[]) =>
    itens.length
      ? `${titulo}\n${itens.map(renderNoticia).join("\n\n")}`
      : `${titulo}\n_(sem notícias)_`;

  const abertura =
    !semIA && d.opening?.trim() ? `📝 ${d.opening.trim()}\n\n` : "";

  const fechamento =
    !semIA && d.closing?.trim() ? `\n\n👀 _${d.closing.trim()}_` : "";

  const avisoIA = semIA
    ? "\n\n⚠️ _Análise da IA indisponível. Exibindo apenas os dados brutos._"
    : "";

  return `🌤️ *PREVISÃO DO TEMPO — ${d.city}*
📅 ${d.date} (${d.timezone})

🌡️ Mín: ${w.min_c}°C | Máx: ${w.max_c}°C
🌧️ Chuva: ${w.rain_probability_percent}% (${w.rain_mm} mm)
💨 Rajadas: ${w.max_wind_gust_kmh} km/h

⚠️ *Alertas:* ${alerts}

${abertura}━━━━━━━━━━━━━━━
${bloco("🇧🇷 *BRASIL*", d.brasil)}

━━━━━━━━━━━━━━━
${bloco("🌎 *MUNDO*", d.mundo)}

━━━━━━━━━━━━━━━
${bloco("💻 *TECNOLOGIA*", d.tecnologia)}
${fechamento}${avisoIA}

━━━━━━━━━━━━━━━
_Fontes: Open-Meteo, INMET, Google News_
_Gerado em: ${new Date(d.generated_at).toLocaleString("pt-BR")}_`;
}
