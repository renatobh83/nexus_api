/**
 * @file useGraficos.js
 * @description Composable para gerenciamento dos gráficos de estatísticas.
 */
function useGraficos({ allTickets, users, channels }) {
  const { ref, computed } = Vue;

  // --- Estado ---
  const statsDataChannel = ref({
    totalTickets: 0,
    uniqueChannels: 0,
    topChannel: "Nenhum",
    averagePerChannel: 0,
  });
  const statusMsg = ref("");
  const chartRefCanal = ref(null);
  const chartRefUsuario = ref(null);
  const chartRefData = ref(null);
  const dataInicio = ref(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  );
  const dataFim = ref(new Date().toISOString().split("T")[0]);
  const chartType = ref("bar");

  let chartHandler = null;
  let chartHandler2 = null;
  let chartHandler3 = null;

  // --- Computed ---
  const totalTickets = computed(() => statsDataChannel.value.totalTickets);
  const topChannel = computed(() => statsDataChannel.value.topChannel);

  // --- Helpers ---

  const getUserMap = () => {
    const map = new Map();
    users.value.forEach((user) => map.set(user.id, user.name));
    return map;
  };

  const getChannelMap = () => {
    const map = new Map();
    channels.value.forEach((channel) => map.set(channel.id, channel.type));
    return map;
  };

  const processTicketsByUser = (data) => {
    const userMap = getUserMap();
    const userCount = {};
    data
      .filter((ticket) => {
        const ticketDate = ticket.createdAt.split("T")[0];
        return ticketDate >= dataInicio.value && ticketDate <= dataFim.value;
      })
      .forEach((ticket) => {
        const userName = userMap.get(ticket.userId) || "Ticket Pendente";
        userCount[userName] = (userCount[userName] || 0) + 1;
      });
    return {
      categories: Object.keys(userCount),
      values: Object.values(userCount),
      countMap: userCount,
    };
  };

  const processTicketsByChannel = (data) => {
    const channelMap = getChannelMap();
    const channelCount = {};
    data
      .filter((ticket) => {
        const ticketDate = ticket.createdAt.split("T")[0];
        return ticketDate >= dataInicio.value && ticketDate <= dataFim.value;
      })
      .forEach((ticket) => {
        const channelType = channelMap.get(ticket.channelId) || "Pendente";
        channelCount[channelType] = (channelCount[channelType] || 0) + 1;
      });
    return {
      categories: Object.keys(channelCount),
      values: Object.values(channelCount),
      countMap: channelCount,
    };
  };

  const processTicketsByDate = (data) => {
    const ticketCount = {};
    data
      .filter((ticket) => {
        const ticketDate = ticket.createdAt.split("T")[0];
        return ticketDate >= dataInicio.value && ticketDate <= dataFim.value;
      })
      .forEach((ticket) => {
        const ticketDate = ticket.createdAt.split("T")[0];
        ticketCount[ticketDate] = (ticketCount[ticketDate] || 0) + 1;
      });
    const sortedCategories = Object.keys(ticketCount).sort((a, b) =>
      a.localeCompare(b),
    );
    const sortedValues = sortedCategories.map((cat) => ticketCount[cat]);
    return {
      categories: sortedCategories,
      values: sortedValues,
      countMap: ticketCount,
    };
  };

  // --- Funções ---

  /** Inicializa e renderiza os 3 gráficos. */
  const consultar = async () => {
    if (!dataInicio.value || !dataFim.value) {
      statusMsg.value = "Selecione ambas as datas!";
      setTimeout(() => (statusMsg.value = ""), 5000);
      return;
    }
    if (dataFim.value < dataInicio.value) {
      statusMsg.value = "Data final não pode ser anterior à data inicial!";
      setTimeout(() => (statusMsg.value = ""), 5000);
      return;
    }

    chartHandler = window.createChartHandler(chartRefCanal, allTickets);
    chartHandler.setTitle("Tickets por Canal");
    chartHandler.setAxisNames("Canal", "Quantidade");
    chartHandler.setProcessFunction(processTicketsByChannel);

    const stats = chartHandler.getStatistics();
    statsDataChannel.value = {
      totalTickets: stats.total,
      uniqueChannels: stats.uniqueCategories,
      topChannel: stats.topCategory,
      averagePerChannel: stats.averagePerCategory,
    };

    chartHandler2 = window.createChartHandler(
      chartRefUsuario,
      allTickets,
      "pie",
    );
    chartHandler2.setTitle("Tickets por Usuario");
    chartHandler2.setAxisNames("Usuario", "Quantidade");
    chartHandler2.setProcessFunction(processTicketsByUser);

    chartHandler3 = window.createChartHandler(chartRefData, allTickets);
    chartHandler3.setTitle("Tickets por Data");
    chartHandler3.setAxisNames("Data", "Quantidade");
    chartHandler3.setProcessFunction(processTicketsByDate);

    await chartHandler.render();
    await chartHandler2.render();
    await chartHandler3.render();
  };

  /** Libera todos os recursos dos gráficos. */
  const limparRecursosGraficos = () => {
    statsDataChannel.value = { totalTickets: 0, topChannel: "Nenhum" };
    [chartHandler, chartHandler2, chartHandler3].forEach((chart, index) => {
      if (chart && typeof chart.dispose === "function") {
        try {
          chart.dispose();
        } catch (error) {
          console.log(`Erro ao destruir chart ${index + 1}:`, error);
        }
      }
    });
    chartHandler = null;
    chartHandler2 = null;
    chartHandler3 = null;
  };

  /** Expõe referência ao chartHandler2 para uso externo (ex: updateSingleTicket). */
  const getChartHandler2 = () => chartHandler2;

  return {
    statsDataChannel,
    statusMsg,
    chartRefCanal,
    chartRefUsuario,
    chartRefData,
    dataInicio,
    dataFim,
    chartType,
    totalTickets,
    topChannel,
    consultar,
    limparRecursosGraficos,
    getChartHandler2,
  };
}
