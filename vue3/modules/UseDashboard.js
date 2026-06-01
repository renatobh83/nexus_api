/**
 * @file useDashboard.js
 * @description Composable para o dashboard de atendimento.
 * Uso: const dashboard = useDashboard({ allTickets, users, channels })
 */
function useDashboard({ allTickets, users, channels }) {
  const { ref, computed, watch, nextTick, onUnmounted } = Vue;

  // ── Constantes ────────────────────────────────────────────────────────────
  const CHANNEL_ICONS = { whatsapp: "💬", telegram: "✈️", webchat: "🌐" };
  const CHANNEL_COLORS = {
    whatsapp: "#25D366",
    telegram: "#2AABEE",
    webchat: "#6C63FF",
  };
  const STATUS_COLOR = {
    open: "#22c55e",
    pending: "#f59e0b",
    closed: "#64748b",
  };
  const STATUS_LABEL = {
    open: "Aberto",
    pending: "Pendente",
    closed: "Encerrado",
  };

  // ── Configuração de SLA (horas) ───────────────────────────────────────────
  // Altere este valor para ajustar o limite de alerta de SLA
  const DASH_SLA_HORAS = ref(2);

  // ── Estado local ──────────────────────────────────────────────────────────
  const dashTabFiltro = ref("all");
  const dashChartRef = ref(null);
  let _barChart = null;

  // ── Helpers de data ───────────────────────────────────────────────────────
  const _toDate = (val) => {
    if (!val) return null;
    const n = Number(val);
    return !isNaN(n) ? new Date(n) : new Date(val);
  };
  const _hoje = () => new Date().toISOString().split("T")[0];
  const _isHoje = (val) =>
    _toDate(val)?.toISOString().split("T")[0] === _hoje();
  const _horasAtras = (val) =>
    (Date.now() - (_toDate(val)?.getTime() ?? 0)) / 3600000;

  // ── Separação grupo x atendimento ────────────────────────────────────────
  const dashServiceTickets = computed(() =>
    allTickets.value.filter((t) => !t.isGroup && !t.isInteraction),
  );
  const dashGroupTickets = computed(() =>
    allTickets.value.filter((t) => t.isGroup && !t.isInteraction),
  );

  // ── Filas (independente de data — trabalho real pendente) ─────────────────
  const dashTicketsAbertos = computed(() =>
    dashServiceTickets.value.filter((t) => t.status === "open"),
  );
  const dashTicketsPendentes = computed(() =>
    dashServiceTickets.value.filter((t) => t.status === "pending"),
  );

  // Abertos de hoje vs anteriores ainda em aberto
  const dashAbertosHoje = computed(() =>
    dashTicketsAbertos.value.filter((t) => _isHoje(t.createdAt)),
  );
  const dashAbertosAnteriores = computed(() =>
    dashTicketsAbertos.value.filter((t) => !_isHoje(t.createdAt)),
  );

  // Fechados só de hoje (KPI de produtividade)
  const dashFechadosHoje = computed(() =>
    dashServiceTickets.value.filter(
      (t) => t.status === "closed" && _isHoje(t.closedAt),
    ),
  );

  // Tickets em risco de SLA: abertos ou pendentes há mais de DASH_SLA_HORAS sem userId
  const dashTicketsSlaRisco = computed(() =>
    [...dashTicketsAbertos.value, ...dashTicketsPendentes.value].filter(
      (t) => _horasAtras(t.createdAt) >= DASH_SLA_HORAS.value,
    ),
  );

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const dashStats = computed(() => ({
    // Fila real — todos os pendentes independente de data
    abertos: dashTicketsAbertos.value.length,
    abertosHoje: dashAbertosHoje.value.length,
    abertosAnteriores: dashAbertosAnteriores.value.length,
    pendentes: dashTicketsPendentes.value.length,
    // Produtividade do dia
    fechadosHoje: dashFechadosHoje.value.length,
    // Fila total atual
    filaTotal:
      dashTicketsAbertos.value.length + dashTicketsPendentes.value.length,
    // SLA
    slaRisco: dashTicketsSlaRisco.value.length,
    slaHoras: DASH_SLA_HORAS.value,
  }));

  // Tempo médio só dos fechados hoje
  const dashAvgTime = computed(() => {
    const finished = dashFechadosHoje.value.filter(
      (t) => t.closedAt && t.createdAt,
    );
    if (!finished.length) return "—";
    const avg =
      finished.reduce(
        (acc, t) => acc + (_toDate(t.closedAt) - new Date(t.createdAt)),
        0,
      ) / finished.length;
    const mins = Math.round(avg / 60000);
    return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h${mins % 60}m`;
  });

  // ── Canais enriquecidos ───────────────────────────────────────────────────
  const dashChannelStats = computed(() =>
    channels.value.map((ch) => {
      const tks = dashServiceTickets.value.filter((t) => t.channelId === ch.id);
      const abertos = tks.filter((t) => t.status === "open");
      return {
        ...ch,
        icon: CHANNEL_ICONS[ch.type] ?? "📡",
        color: CHANNEL_COLORS[ch.type] ?? "#aaa",
        total: tks.length,
        abertos: abertos.length,
        abertosHoje: abertos.filter((t) => _isHoje(t.createdAt)).length,
        abertosAnteriores: abertos.filter((t) => !_isHoje(t.createdAt)).length,
        pendentes: tks.filter((t) => t.status === "pending").length,
        fechadosHoje: tks.filter(
          (t) => t.status === "closed" && _isHoje(t.closedAt),
        ).length,
      };
    }),
  );

  // ── Agentes — carga atual + produtividade do dia ──────────────────────────
  const dashAgentStats = computed(() =>
    users.value.map((u) => {
      const tks = dashServiceTickets.value.filter((t) => t.userId === u.id);
      return {
        ...u,
        initials: u.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
        emMaos: tks.filter((t) => t.status === "open").length,
        fechadosHoje: tks.filter(
          (t) => t.status === "closed" && _isHoje(t.closedAt),
        ).length,
        total:
          tks.filter((t) => t.status === "open").length +
          tks.filter((t) => t.status === "closed" && _isHoje(t.closedAt))
            .length,
      };
    }),
  );

  // ── Pie data: fila atual (abertos + pendentes) + fechados hoje ────────────
  const dashPieData = computed(() => [
    {
      name: "Abertos hoje",
      value: dashStats.value.abertosHoje,
      color: "#22c55e",
    },
    {
      name: "Abertos anteriores",
      value: dashStats.value.abertosAnteriores,
      color: "#ef4444",
    },
    { name: "Pendentes", value: dashStats.value.pendentes, color: "#f59e0b" },
    {
      name: "Fechados hoje",
      value: dashStats.value.fechadosHoje,
      color: "#64748b",
    },
  ]);

  const dashPieTotal = computed(() =>
    dashPieData.value.reduce((s, d) => s + d.value, 0),
  );

  // ── Volume por hora — só hoje ─────────────────────────────────────────────
  const dashHourlyData = computed(() => {
    const hours = Array.from({ length: 10 }, (_, i) => ({
      hour: `${8 + i}h`,
      count: 0,
    }));
    dashServiceTickets.value
      .filter((t) => _isHoje(t.createdAt))
      .forEach((t) => {
        const h = new Date(t.createdAt).getHours();
        const idx = h - 8;
        if (idx >= 0 && idx < 10) hours[idx].count++;
      });
    return hours;
  });

  // ── Tickets filtrados para tabela ─────────────────────────────────────────
  // Mostra: todos os abertos/pendentes (fila real) + fechados de hoje
  // Ordenação: anteriores em aberto primeiro (mais urgentes)
  const dashFilteredTickets = computed(() => {
    let tks = dashServiceTickets.value.filter(
      (t) =>
        t.status === "open" ||
        t.status === "pending" ||
        (t.status === "closed" && _isHoje(t.closedAt)),
    );

    if (dashTabFiltro.value !== "all") {
      tks = tks.filter((t) => {
        const ch = channels.value.find((c) => c.id === t.channelId);
        return ch?.type === dashTabFiltro.value;
      });
    }

    // Ordenação: anteriores abertos > pendentes > abertos hoje > fechados
    const ordem = (t) => {
      if (t.status === "open" && !_isHoje(t.createdAt)) return 0; // anterior aberto — urgente
      if (t.status === "pending") return 1;
      if (t.status === "open" && _isHoje(t.createdAt)) return 2;
      return 3; // fechado
    };

    return [...tks].sort((a, b) => ordem(a) - ordem(b)).slice(0, 15);
  });

  // ── Flag SLA por ticket ───────────────────────────────────────────────────
  const dashTicketEmRisco = (t) =>
    (t.status === "open" || t.status === "pending") &&
    _horasAtras(t.createdAt) >= DASH_SLA_HORAS.value;

  const dashTicketAnterior = (t) =>
    (t.status === "open" || t.status === "pending") && !_isHoje(t.createdAt);

  // ── Grupos por canal ──────────────────────────────────────────────────────
  const dashGroupByChannel = computed(() =>
    channels.value
      .map((ch) => ({
        ...ch,
        icon: CHANNEL_ICONS[ch.type] ?? "📡",
        count: dashGroupTickets.value.filter((t) => t.channelId === ch.id)
          .length,
      }))
      .filter((ch) => ch.count > 0),
  );

  // ── Top contatos do dia ───────────────────────────────────────────────────
  const dashTopContatos = computed(() => {
    const contagem = {};
    dashServiceTickets.value
      .filter((t) => _isHoje(t.createdAt) && t.contato)
      .forEach((t) => {
        contagem[t.owner] = (contagem[t.owner] || 0) + 1;
      });

    return Object.entries(contagem)
      .map(([contato, total]) => ({ contato, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  });

  // ── Helpers de lookup ─────────────────────────────────────────────────────
  const dashGetChannel = (id) => channels.value.find((c) => c.id === id);
  const dashGetUser = (id) => users.value.find((u) => u.id === id);

  const dashFmtTime = (isoStr) => {
    if (!isoStr) return "—";
    return _toDate(isoStr)?.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const dashFmtHorasAtras = (isoStr) => {
    const h = _horasAtras(isoStr);
    if (h < 1) return `${Math.round(h * 60)}m atrás`;
    return `${Math.floor(h)}h${Math.round((h % 1) * 60)
      .toString()
      .padStart(2, "0")} atrás`;
  };

  // Helpers para template
  const dashChannelIcon = (id) =>
    CHANNEL_ICONS[dashGetChannel(id)?.type] ?? "📡";
  const dashChannelColor = (id) =>
    CHANNEL_COLORS[dashGetChannel(id)?.type] ?? "#aaa";
  const dashChannelName = (id) => dashGetChannel(id)?.name ?? "—";
  const dashUserName = (id) =>
    id ? (dashGetUser(id)?.name ?? "—") : "Sem atendente";
  const dashUserColor = (id) => (id ? "var(--dash-text)" : "#f59e0b");
  const dashStatusColor = (s) => STATUS_COLOR[s] ?? "#aaa";
  const dashStatusLabel = (s) => STATUS_LABEL[s] ?? s;
  const dashStatusBg = (s) => (STATUS_COLOR[s] ?? "#aaa") + "22";

  // ── ECharts: gráfico de barras ────────────────────────────────────────────
  function dashBuildBarChart() {
    if (!dashChartRef.value || !window.echarts) return;
    if (!_barChart) _barChart = echarts.init(dashChartRef.value, "dark");

    _barChart.setOption({
      backgroundColor: "transparent",
      grid: { top: 10, right: 10, bottom: 24, left: 32 },
      xAxis: {
        type: "category",
        data: dashHourlyData.value.map((h) => h.hour),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: "#8b92a8", fontSize: 11 },
      },
      yAxis: {
        type: "value",
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: "#252a38" } },
        axisLabel: { color: "#8b92a8", fontSize: 11 },
      },
      series: [
        {
          type: "bar",
          data: dashHourlyData.value.map((h) => h.count),
          barMaxWidth: 28,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "#6C63FF" },
              { offset: 1, color: "#2AABEE" },
            ]),
            borderRadius: [4, 4, 0, 0],
          },
          emphasis: { itemStyle: { color: "#8b85ff" } },
        },
      ],
      tooltip: {
        trigger: "axis",
        backgroundColor: "#181c25",
        borderColor: "#252a38",
        textStyle: { color: "#e8eaf0", fontSize: 12 },
        formatter: (p) => `${p[0].name}: <b>${p[0].value}</b> tickets`,
      },
    });
  }

  let _resizeObserver = null;

  function dashResizeChart() {
    _barChart?.resize();
  }

  function dashInitChart() {
    nextTick(() => {
      if (!dashChartRef.value || !window.echarts) return;

      // Aguarda o container ter largura real antes de inicializar
      // Necessário pois no primeiro render o elemento pode ainda não ter dimensões
      _resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        const { width } = entry.contentRect;
        if (width === 0) return; // ainda sem largura, aguarda

        // Primeira vez com largura real: inicializa e desconecta o observer de boot
        if (!_barChart) {
          dashBuildBarChart();
          // Mantém observando só para resize posterior
          return;
        }
        _barChart.resize();
      });

      _resizeObserver.observe(dashChartRef.value);
      window.addEventListener("resize", dashResizeChart);
    });
  }

  function dashDisposeChart() {
    window.removeEventListener("resize", dashResizeChart);
    if (_resizeObserver) {
      _resizeObserver.disconnect();
      _resizeObserver = null;
    }
    if (_barChart) {
      _barChart.dispose();
      _barChart = null;
    }
  }

  watch(dashHourlyData, () => nextTick(dashBuildBarChart));

  return {
    // config
    DASH_SLA_HORAS,
    // estado
    dashTabFiltro,
    dashChartRef,
    // computed
    dashStats,
    dashAvgTime,
    dashChannelStats,
    dashAgentStats,
    dashPieData,
    dashPieTotal,
    dashFilteredTickets,
    dashGroupTickets,
    dashGroupByChannel,
    dashTopContatos,
    // métodos
    dashGetChannel,
    dashGetUser,
    dashFmtTime,
    dashFmtHorasAtras,
    dashTicketEmRisco,
    dashTicketAnterior,
    dashChannelIcon,
    dashChannelColor,
    dashChannelName,
    dashUserName,
    dashUserColor,
    dashStatusColor,
    dashStatusLabel,
    dashStatusBg,
    dashInitChart,
    dashDisposeChart,
    // constantes
    CHANNEL_ICONS,
    CHANNEL_COLORS,
    STATUS_COLOR,
    STATUS_LABEL,
  };
}
