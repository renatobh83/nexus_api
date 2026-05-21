// chartHandler.js - Módulo completo para gerenciar gráficos ECharts
// Com suporte para múltiplos gráficos, dados diferentes e processamento personalizado

/**
 * Classe para gerenciar gráficos ECharts
 * Suporta diferentes fontes de dados e processamento personalizado
 */
class ChartHandler {
  constructor(chartDomRef, dataRef, chartTypeRef = null) {
    this.chartInstance = null;
    this.chartDomRef = chartDomRef; // Ref do Vue para o elemento DOM
    this.dataRef = dataRef; // Ref do Vue para os dados (pode ser tickets, usuarios, etc)
    this.chartTypeRef = chartTypeRef; // Ref do Vue para o tipo de gráfico
    this.resizeHandler = null; // Handler do evento resize
    this.customProcessFunction = null; // Função personalizada para processar os dados
    this.customOptionFunction = null; // Função personalizada para configurar o gráfico
    this.title = "Gráfico"; // Título personalizável
    this.xAxisName = "Categorias"; // Nome do eixo X
    this.yAxisName = "Valores"; // Nome do eixo Y
    this.userName = "";
  }

  /**
   * Define uma função personalizada para processar os dados
   * @param {Function} fn - Função que recebe os dados e retorna { categories, values, countMap }
   */
  setProcessFunction(fn) {
    this.customProcessFunction = fn;
  }

  /**
   * Define uma função personalizada para configurar o gráfico
   * @param {Function} fn - Função que recebe os dados processados e retorna a option do ECharts
   */
  setOptionFunction(fn) {
    this.customOptionFunction = fn;
  }

  /**
   * Define o título do gráfico
   * @param {string} title
   */
  setTitle(title) {
    this.title = title;
  }

  /**
   * Define os nomes dos eixos
   * @param {string} xName
   * @param {string} yName
   */
  setAxisNames(xName, yName) {
    this.xAxisName = xName;
    this.yAxisName = yName;
  }

  /**
   * Processa os dados brutos para o formato do gráfico
   * @returns {Object} { categories, values, countMap }
   */
  processData() {
    // Se tem função personalizada, usa ela
    if (this.customProcessFunction) {
      return this.customProcessFunction(this.dataRef.value);
    }

    // Processamento padrão: agrupa por categoria
    const data = this.dataRef.value;
    const countMap = {};

    if (!data || data.length === 0) {
      return { categories: [], values: [], countMap: {} };
    }

    data.forEach((item) => {
      // Tenta encontrar uma chave para agrupar
      let key = null;
      if (item.channelId) key = item.channelId;
      else if (item.userId) key = item.userId;
      else if (item.name) key = item.name;
      else if (item.category) key = item.category;
      else if (typeof item === "string") key = item;
      else key = JSON.stringify(item);

      countMap[key] = (countMap[key] || 0) + 1;
    });

    const categories = Object.keys(countMap);
    const values = Object.values(countMap);

    return { categories, values, countMap };
  }

  /**
   * Gera cores para as categorias
   * @param {number} count
   * @returns {Array}
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
   * Calcula estatísticas dos dados atuais
   * @returns {Object}
   */
  getStatistics() {
    const { categories, values } = this.processData();
    const total = values.reduce((sum, v) => sum + v, 0);
    const uniqueCategories = categories.length;
    const topCategory =
      categories.length > 0
        ? categories[values.indexOf(Math.max(...values))]
        : "Nenhum";
    const averagePerCategory =
      categories.length > 0 ? (total / categories.length).toFixed(1) : 0;

    const details = categories.map((category, index) => ({
      name: category,
      count: values[index],
      percentage: total > 0 ? ((values[index] / total) * 100).toFixed(1) : 0,
    }));

    return {
      total,
      uniqueCategories,
      topCategory,
      averagePerCategory,
      details,
      categories,
      values,
    };
  }

  /**
   * Obtém a configuração do gráfico baseado no tipo atual
   * @returns {Object} Opção do ECharts
   */
  getChartOption() {
    const { categories, values, total } = this.processData();
    const currentType = this.chartTypeRef ? this.chartTypeRef : "bar";

    // Se tem função personalizada, usa ela
    if (this.customOptionFunction) {
      return this.customOptionFunction({
        categories,
        values,
        total,
        currentType,
        title: this.title,
        xAxisName: this.xAxisName,
        yAxisName: this.yAxisName,
      });
    }

    const colors = this.generateColors(categories.length);

    const baseOption = {
      title: {
        text: `${this.title}`,
        // text: `${this.title} (Total: ${total})`,
        left: "center",
        top: 10,
        textStyle: { fontSize: 14, fontWeight: "bold" },
      },
      tooltip: {
        trigger: currentType === "pie" ? "item" : "axis",
        formatter: function (params) {
          if (currentType === "pie") {
            return `${params.name}<br/>Valor: ${params.value}<br/>${params.percent}%`;
          }
          if (params[0]) {
            return `${params[0].axisValue}<br/>Valor: ${params[0].value}`;
          }
          return "";
        },
      },
      toolbox: {
        feature: {
          saveAsImage: { title: "Salvar como imagem" },
        },
      },
      label: {
        color: "#999",
        fontSize: 12,
        fontWeight: "bold",
      },
      graphic: [
        {
          type: "text",
          left: "left",
          top: 20,
          style: {
            text: "",
            fill: "#999",

            fontSize: 12,
          },
          invisible: true,
        },
      ],
    };

    // Configuração para gráfico de pizza
    if (currentType === "pie") {
      // Configurações ajustáveis
      const MAX_NAME_LENGTH = 12; // Tamanho máximo do nome
      const MIN_PERCENT_FOR_LABEL = 3; // Percentual mínimo para mostrar label

      // Função para formatar o nome
      const formatName = (name) => {
        if (name.length <= MAX_NAME_LENGTH) return name;
        return name.substring(0, MAX_NAME_LENGTH - 3) + "...";
      };
      return {
        ...baseOption,
        tooltip: {
          trigger: "item",
          formatter: (params) => {
            // Tooltip com informações completas
            return `<strong>${params.name}</strong><br/>
                Tickets: ${params.value}<br/>
                Percentual: ${params.percent.toFixed(1)}%`;
          },
        },
        series: [
          {
            name: this.title,
            type: "pie",
            radius: ["40%", "65%"],
            center: ["50%", "55%"],
            avoidLabelOverlap: true, // Evita sobreposição de labels
            data: categories.map((category, index) => ({
              name: category,
              value: values[index],
              itemStyle: { color: colors[index] },
            })),
            emphasis: {
              scale: true,
              label: { show: true, formatter: "{b}: {d}%" },
            },
            label: {
              show: true,
              position: "outside",
              formatter: (params) => {
                // Só mostra label para fatias significativas
                if (params.percent < MIN_PERCENT_FOR_LABEL) {
                  return "";
                }
                const shortName = formatName(params.name);
                return `${shortName}: ${params.percent.toFixed(0)}%`;
              },
              fontSize: 11,
              fontWeight: "normal",
              fontFamily: "Arial, sans-serif",
              color: "#999",
            },
            labelLine: {
              show: true,
              length: 10,
              length2: 15,
              smooth: true,
              lineStyle: {
                color: "#999",
                width: 1,
              },
            },
            emphasis: {
              scale: true,
              label: {
                show: true,
                formatter: (params) => {
                  // No hover, mostra o nome completo
                  return `${params.name}\n${params.percent.toFixed(1)}%`;
                },
                fontSize: 12,
                fontWeight: "bold",
              },
            },
            itemStyle: {
              borderRadius: 8,
              borderColor: "#fff",
              borderWidth: 2,
            },
          },
        ],
      };
    }

    // Configuração para gráficos de barra e linha
    return {
      ...baseOption,
      grid: {
        top: 60,
        bottom: 30,
        left: 60,
        right: 40,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: categories,
        name: this.xAxisName,
        nameLocation: "middle",
        nameGap: 35,
        axisLabel: {
          rotate: categories.length > 6 ? 25 : 0,
          fontSize: 11,
          interval: 0,
        },
        axisLine: { lineStyle: { color: "#667eea" } },
      },
      yAxis: {
        type: "value",
        name: this.yAxisName,
        nameLocation: "middle",
        nameGap: 45,
        axisLabel: { fontSize: 11 },
        splitLine: { lineStyle: { type: "dashed" } },
      },
      series: [
        {
          name: this.title,
          type: currentType === "line" ? "line" : "bar",
          data: values,
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
            show: values.length <= 15,
            position: "top",
            formatter: "{c}",
            fontSize: 11,
          },
        },
      ],
    };
  }

  /**
   * Renderiza ou atualiza o gráfico
   * @returns {Promise<boolean>}
   */
  async render() {
    // Aguarda um tick para garantir DOM pronto
    await new Promise((resolve) => setTimeout(resolve, 0));

    const chartDom = this.chartDomRef.value;
    if (!chartDom) {
      console.warn(
        `[ChartHandler] Elemento do gráfico não encontrado: ${this.title}`,
      );
      return false;
    }

    // Cria instância se não existir
    if (!this.chartInstance) {
      this.chartInstance = echarts.init(chartDom);

      // Configura evento de resize
      this.resizeHandler = () => {
        console.log(`[ChartHandler] Resize detectado: ${this.title}`);
        this.chartInstance?.resize();
      };
      window.addEventListener("resize", this.resizeHandler);
    }

    const option = this.getChartOption();
    this.chartInstance.setOption(option, true);
    return true;
  }

  /**
   * Atualiza apenas os dados (mais eficiente que recriar tudo)
   * @returns {boolean}
   */
  updateData() {
    if (!this.chartInstance) return false;

    const { categories, values, total } = this.processData();
    const currentType = this.chartTypeRef ? this.chartTypeRef.value : "bar";

    if (currentType === "pie") {
      const colors = this.generateColors(categories.length);
      this.chartInstance.setOption({
        title: { text: `${this.title} (Total: ${total})` },
        series: [
          {
            data: categories.map((category, index) => ({
              name: category,
              value: values[index],
              itemStyle: { color: colors[index] },
            })),
          },
        ],
      });
    } else {
      this.chartInstance.setOption({
        title: { text: `${this.title} (Total: ${total})` },
        xAxis: { data: categories },
        series: [{ data: values }],
      });
    }

    return true;
  }

  /**
   * Muda o tipo do gráfico
   * @param {string} newType - 'bar', 'line', 'pie'
   */
  changeChartType(newType) {
    if (this.chartTypeRef) {
      this.chartTypeRef.value = newType;
    }
    this.render();
  }

  /**
   * Força o redimensionamento do gráfico
   */
  resize() {
    if (this.chartInstance) {
      this.chartInstance.resize();
    }
  }

  /**
   * Limpa todos os recursos
   */
  dispose() {
    if (this.resizeHandler) {
      window.removeEventListener("resize", this.resizeHandler);
      this.resizeHandler = null;
    }
    if (this.chartInstance) {
      this.chartInstance.dispose();
      this.chartInstance = null;
    }
  }
}

/**
 * Função global para criar um novo handler de gráfico
 * @param {Ref} chartDomRef - Referência do DOM do Vue
 * @param {Ref} dataRef - Referência dos dados do Vue
 * @param {Ref} chartTypeRef - Referência do tipo de gráfico (opcional)
 * @returns {ChartHandler}
 */
window.createChartHandler = function (
  chartDomRef,
  dataRef,
  chartTypeRef = null,
) {
  return new ChartHandler(chartDomRef, dataRef, chartTypeRef);
};

/**
 * Utilitário para criar processadores de dados comuns
 */
window.ChartProcessors = {
  /**
   * Processa tickets por canal
   */
  ticketsByChannel: (data) => {
    const channelCount = {};
    data.forEach((ticket) => {
      const channel = ticket.channelId || ticket.canal;
      if (channel) {
        channelCount[channel] = (channelCount[channel] || 0) + 1;
      }
    });
    return {
      categories: Object.keys(channelCount),
      values: Object.values(channelCount),
      countMap: channelCount,
    };
  },

  /**
   * Processa tickets por usuário
   */
  ticketsByUser: (data) => {
    const userCount = {};

    data.forEach((ticket) => {
      const user = ticket.userId;
      if (user) {
        userCount[user] = (userCount[user] || 0) + 1;
      }
    });
    return {
      categories: Object.keys(userCount),
      values: Object.values(userCount),
      countMap: userCount,
    };
  },

  /**
   * Processa dados que já têm categoria e valor
   */
  preProcessedData: (data) => {
    const categories = data.map(
      (item) => item.name || item.category || item.label,
    );
    const values = data.map(
      (item) => item.value || item.count || item.quantidade,
    );
    const countMap = {};
    categories.forEach((cat, i) => {
      countMap[cat] = values[i];
    });
    return { categories, values, countMap };
  },

  /**
   * Processa dados simples (array de strings)
   */
  simpleArray: (data) => {
    const countMap = {};
    data.forEach((item) => {
      countMap[item] = (countMap[item] || 0) + 1;
    });
    return {
      categories: Object.keys(countMap),
      values: Object.values(countMap),
      countMap,
    };
  },
};
