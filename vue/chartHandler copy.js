// chartHandler.js - Módulo para gerenciar o gráfico ECharts
// Este arquivo NÃO usa import/export, é carregado via script tag

/**
 * Classe para gerenciar o gráfico ECharts
 */
class ChartHandler {
  constructor(chartDomRef, ticketsRef, chartTypeRef = null) {
    this.chartInstance = null;
    this.chartDomRef = chartDomRef; // Ref do Vue para o DOM
    this.ticketsRef = ticketsRef; // Ref do Vue para os tickets
    this.chartTypeRef = chartTypeRef; // Ref do Vue para o tipo de gráfico
    this.resizeHandler = null;
  }
  /**
   * Processa os tickets e agrupa por canal
   */
  processTicketsByChannel() {
    const tickets = this.ticketsRef.value;
    const channelCount = {};

    tickets.forEach((ticket) => {
      const channel = ticket.channelId;
      channelCount[channel] = (channelCount[channel] || 0) + 1;
    });

    const channels = Object.keys(channelCount);
    const counts = Object.values(channelCount);

    return { channels, counts, channelCount };
  }
  processTicketsByUser() {
    const tickets = this.ticketsRef.value;
    const userCount = {};
    tickets.forEach((ticket) => {
      const user = ticket.userId;
      userCount[user] = (userCount[user] || 0) + 1;
    });
    const users = Object.keys(userCount);
    const userCounts = Object.values(userCount);
    return { users, userCounts, userCount };
  }
  /**
   * Gera cores para os canais
   */
  generateColors(count) {
    const colors = [
      "#5470c6",
      "#fac858",
      "#ee6666",
      "#73c0de",
      "#3ba272",
      "#fc8452",
      "#9a60b4",
      "#ea7ccc",
    ];
    if (count <= colors.length) return colors.slice(0, count);

    const extraColors = [];
    for (let i = 0; i < count - colors.length; i++) {
      extraColors.push(`hsl(${Math.random() * 360}, 70%, 60%)`);
    }
    return [...colors, ...extraColors];
  }

  /**
   * Calcula estatísticas dos tickets
   */
  getStatistics() {
    const tickets = this.ticketsRef.value;
    const { channels, counts } = this.processTicketsByChannel();
    const { users, userCounts } = this.processTicketsByUser();
    const totalUser = users.length;
    const totalTickets = tickets.length;
    const uniqueChannels = channels.length;
    const topChannel =
      channels.length > 0
        ? channels[counts.indexOf(Math.max(...counts))]
        : "Nenhum";
    const averagePerChannel =
      channels.length > 0 ? (totalTickets / channels.length).toFixed(1) : 0;

    const channelStats = channels.map((channel, index) => ({
      channel,
      count: counts[index],
      percentage: ((counts[index] / totalTickets) * 100).toFixed(1),
    }));

    return {
      totalTickets,
      uniqueChannels,
      topChannel,
      averagePerChannel,
      channelStats,
      channels,
      counts,
      totalUser,
    };
  }

  /**
   * Obtém a configuração do gráfico baseado no tipo atual
   */
  getChartOption() {
    const { channels, counts, totalTickets } = this.getStatistics();
    const currentType = this.chartTypeRef ? this.chartTypeRef.value : "bar";
    const colors = this.generateColors(channels.length);

    const baseOption = {
      title: {
        text: `Tickets por Canal de Atendimento (Total: ${totalTickets})`,
        left: "center",
        top: 10,
        textStyle: { fontSize: 16, fontWeight: "bold" },
      },
      tooltip: {
        trigger: currentType === "pie" ? "item" : "axis",
        formatter: function (params) {
          if (currentType === "pie") {
            return `${params.name}<br/>Tickets: ${params.value}<br/>${params.percent}%`;
          }
          return `${params[0].axisValue}<br/>Tickets: ${params[0].value}`;
        },
      },
      toolbox: {
        feature: {
          saveAsImage: { title: "Salvar como imagem" },
        },
      },
    };

    if (currentType === "pie") {
      return {
        ...baseOption,
        series: [
          {
            name: "Tickets por Canal",
            type: "pie",
            radius: "55%",
            center: ["50%", "55%"],
            data: channels.map((channel, index) => ({
              name: channel,
              value: counts[index],
              itemStyle: { color: colors[index] },
            })),
            emphasis: {
              scale: true,
              label: { show: true, formatter: "{b}: {d}%" },
            },
            label: {
              show: true,
              formatter: "{b}: {d}%",
            },
          },
        ],
      };
    }

    return {
      ...baseOption,
      grid: {
        top: 70,
        bottom: 30,
        left: 60,
        right: 40,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: channels,
        name: "Canais de Atendimento",
        nameLocation: "middle",
        nameGap: 35,
        axisLabel: {
          rotate: channels.length > 5 ? 25 : 0,
          fontSize: 12,
        },
        axisLine: { lineStyle: { color: "#667eea" } },
      },
      yAxis: {
        type: "value",
        name: "Quantidade de Tickets",
        nameLocation: "middle",
        nameGap: 45,
        axisLabel: { fontSize: 12 },
        splitLine: { lineStyle: { type: "dashed" } },
      },
      series: [
        {
          name: "Tickets",
          type: currentType === "line" ? "line" : "bar",
          data: counts,
          itemStyle: {
            borderRadius: currentType === "bar" ? [5, 5, 0, 0] : 0,
            color: "#667eea",
          },
          lineStyle: {
            width: 3,
            color: "#764ba2",
          },
          smooth: currentType === "line",
          areaStyle:
            currentType === "line"
              ? {
                  opacity: 0.3,
                  color: "#667eea",
                }
              : undefined,
          label: {
            show: true,
            position: currentType === "line" ? "top" : "top",
            formatter: "{c}",
          },
        },
      ],
    };
  }

  /**
   * Renderiza ou atualiza o gráfico
   */
  async render() {
    await new Promise((resolve) => setTimeout(resolve, 0));

    const chartDom = this.chartDomRef.value;
    if (!chartDom) {
      console.warn("Elemento do gráfico não encontrado");
      return false;
    }

    if (!this.chartInstance) {
      this.chartInstance = echarts.init(chartDom);

      this.resizeHandler = () => this.chartInstance?.resize();
      window.addEventListener("resize", this.resizeHandler);
    }

    const option = this.getChartOption();
    this.chartInstance.setOption(option, true);
    return true;
  }

  /**
   * Atualiza apenas os dados
   */
  updateData() {
    if (!this.chartInstance) return false;

    const { channels, counts, totalTickets } = this.getStatistics();

    if (this.chartTypeRef?.value === "pie") {
      this.chartInstance.setOption({
        title: {
          text: `Tickets por Canal de Atendimento (Total: ${totalTickets})`,
        },
        series: [
          {
            data: channels.map((channel, index) => ({
              name: channel,
              value: counts[index],
            })),
          },
        ],
      });
    } else {
      this.chartInstance.setOption({
        title: {
          text: `Tickets por Canal de Atendimento (Total: ${totalTickets})`,
        },
        xAxis: { data: channels },
        series: [{ data: counts }],
      });
    }
    return true;
  }

  /**
   * Muda o tipo do gráfico
   */
  changeChartType(newType) {
    if (this.chartTypeRef) {
      this.chartTypeRef.value = newType;
    }
    this.render();
  }

  /**
   * Limpa recursos
   */
  dispose() {
    if (this.resizeHandler) {
      window.removeEventListener("resize", this.resizeHandler);
    }
    if (this.chartInstance) {
      this.chartInstance.dispose();
      this.chartInstance = null;
    }
  }
}

// Criando uma função global para inicializar o handler
// Isso evita poluir o escopo global com a classe
window.createChartHandler = function (
  chartDomRef,
  ticketsRef,
  chartTypeRef = null,
) {
  return new ChartHandler(chartDomRef, ticketsRef, chartTypeRef);
};
