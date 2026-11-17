function useFlow({
  ticketNovo,
  URL_BASE,
  token,
  initAI,
  aiEngine,
  sonnerAlert,
}) {
  const { ref, onMounted, nextTick, watch } = Vue;

  /* ── Node HTML ── */
  function nodeHTML(data) {
    const props = (data.props || [])
      .map(
        (p) =>
          `<div class="n-prop"><span>${p.k}</span><span>${p.v}</span></div>`,
      )
      .join("");
    return `
    <div class="n-node">
      <div class="n-header">
        <div class="n-icon" style="background:${data.color}28">${data.icon}</div>
        <div>
          <div class="n-title">${data.label}</div>
          <div class="n-sub">${data.sub || ""}</div>
        </div>
      </div>
      <div class="n-body">
        ${props}
        <!--<div class="n-badge st-idle">· Aguardando</div>-->
      </div>
    </div>`;
  }

  /* ── Palette ── */
  const PALETTE = [
    // ========================================
    // 🚀 TRIGGERS E INÍCIO DE FLUXO
    // ========================================
    {
      type: "trigger",
      label: "Trigger",
      icon: "⚡",
      color: "#ff9f0a",
      sub: "Início do fluxo",
      props: [{ k: "Intervalo", v: "5 s" }],
      inputs: 0,
      outputs: 1,
    },
    // ========================================
    // ⏪ RETORNO E TRANSFERÊNCIA
    // ========================================
    {
      type: "voltar_anterior",
      label: "Voltar Menu Anterior",
      icon: "⏪",
      color: "#ff9f0a",
      sub: "Retorna para o módulo anterior",
      props: [], // Não precisa de configuração, o backend lê o histórico
      inputs: 1,
      outputs: 0, // Não continua para o próximo nó, ele "pula" de módulo
    },
    {
      type: "transferir_humano",
      label: "Falar com Atendente",
      icon: "🙋‍♂️",
      color: "#ff453a",
      sub: "Encerra o bot e transfere para humano",
      props: [],
      inputs: 1,
      outputs: 0, // O fluxo acaba aqui
    },
    // ========================================
    // 💬 ENVIO DE MENSAGENS (WhatsApp)
    // ========================================
    {
      type: "sendMsg",
      label: "Enviar Mensagem",
      icon: "💬",
      color: "#0a84ff",
      sub: "Envia mensagem direta",
      props: [
        { k: "Tipo", v: "text" },
        { k: "Número", v: "" },
      ],
      inputs: 1,
      outputs: 1,
    },
    {
      type: "sendMessage",
      label: "Resposta ao Usuário",
      icon: "📨",
      color: "#0a84ff",
      sub: "Envia resposta final processada pela IA",
      inputs: 1,
      outputs: 1,
    },
    {
      type: "router",
      label: "Direcionar Serviço",
      icon: "🔀",
      color: "#ff9f0a",
      sub: "Encaminha para o módulo escolhido",
      props: [
        { k: "Módulo Destino", v: "" }, // nome exato do módulo (ex: "Agendamento")
      ],
      inputs: 1,
      outputs: 1,
    },
    {
      type: "text",
      label: "Mensagem Fixa",
      icon: "📝",
      color: "#0a84ff",
      sub: "Define texto estático para o fluxo",
      props: [{ k: "Mensagem", v: "" }],
      inputs: 1,
      outputs: 1,
    },

    // ========================================
    // 🧠 PROCESSAMENTO COM IA
    // ========================================
    {
      type: "processarIa",
      label: "Processar com IA",
      icon: "🧠",
      color: "#32d74b",
      sub: "Gera resposta usando modelo de IA",
      props: [
        { k: "Modelo", v: "gemma-4-31b-it" },
        { k: "Prompt", v: "agendamento" },
        { k: "Histórico Máx.", v: "10" },
        { k: "Temperatura", v: "0.7" },
        { k: "Tokens Máx.", v: "500" },
      ],
      inputs: 1,
      outputs: 1,
    },

    // ========================================
    // ⚙️ PROCESSAMENTO DE DADOS
    // ========================================
    {
      type: "processarDados",
      label: "Processar Dados",
      icon: "⚙️",
      color: "#32d74b",
      sub: "Executa lógica de negócio nos dados",
      props: [{ k: "Processar dados", v: "agendamento" }],
      inputs: 1,
      outputs: 4,
    },
    {
      type: "transform",
      label: "Transformar Dados",
      icon: "🔀",
      color: "#32d74b",
      sub: "Converte formato dos dados",
      props: [
        { k: "Entrada", v: "auto" },
        { k: "Saída", v: "JSON" },
      ],
      inputs: 1,
      outputs: 1,
    },

    // ========================================
    // 🌐 INTEGRAÇÕES EXTERNAS
    // ========================================
    {
      type: "http",
      label: "HTTP Request",
      icon: "🌐",
      color: "#0a84ff",
      sub: "Consulta API externa",
      props: [
        {
          k: "Método",
          v: "GET",
        },
        { k: "URL", v: "/api/" },
        {
          k: "Parâmetros da Rota",
          v: "",
        },

        { k: "Body", v: '{"status":"pending"}' },
      ],
      inputs: 1,
      outputs: 1,
    },

    // ========================================
    // 🗄️ BANCO DE DADOS
    // ========================================
    {
      type: "db",
      label: "Banco de Dados",
      icon: "🗄️",
      color: "#34c759",
      sub: "Persiste dados no banco",
      props: [
        { k: "Tabela", v: "fiis_score" },
        { k: "Operação", v: "UPSERT" },
      ],
      inputs: 1,
      outputs: 1,
    },

    // ========================================
    // ⚖️ CONTROLE DE FLUXO
    // ========================================
    {
      type: "filter",
      label: "Filtro IF",
      icon: "⚖️",
      color: "#bf5af2",
      sub: "Condição lógica para decisão",
      props: [
        { k: "Campo", v: "" },
        { k: "Operador", v: "=" },
        { k: "Valor", v: "" },
      ],
      inputs: 1,
      outputs: 2,
    },
    {
      type: "waitResponse",
      label: "Aguardar Resposta",
      icon: "⏳",
      color: "#bf5af2",
      sub: "Espera interação do usuário",
      inputs: 1,
      outputs: 2,
    },

    // ========================================
    // 🔔 NOTIFICAÇÕES E ALERTAS
    // ========================================
    {
      type: "notify",
      label: "Notificação",
      icon: "🔔",
      color: "#ff6d5a",
      sub: "Envia alerta externo",
      props: [{ k: "Canal", v: "#alertas" }],
      inputs: 1,
      outputs: 0,
    },
  ];
  /* ── Estado ── */
  let _drag = null;
  let editor = null;
  const flowAtual = ref(null); // { id, nome } do flow carregado/salvo
  const salvandoFlow = ref(false);
  const palette = PALETTE;
  const df = ref(null);
  const selectedNode = ref(null);
  const showModal = ref(false);
  const modulos = ref([{ nome: "Home", protegido: true }]);
  const moduloAtivo = ref("Home");
  const showModalModulo = ref(false);
  const moduloEditando = ref({ nome: "", original: null });
  const moduloErro = ref("");

  const showModalCarregar = ref(false);
  const flowsDisponiveis = ref([]);
  const carregandoFlows = ref(false);
  const ativandoFlowId = ref(null);

  const showVars = ref(false);
  const currentPropIndex = ref(null);

  const showModalPrompts = ref(false);
  const promptsDisponiveis = ref([]);
  const carregandoPrompts = ref(false);
  const promptEditando = ref(null);
  const salvandoPrompt = ref(false);

  const variables = [
    { label: "Nome do Cliente", value: "{{ticket.owner}}" },
    { label: "Telefone", value: "{{ticket.contato}}" },
    { label: "Status Ticket", value: "{{ticket.status}}" },
    { label: "Última Mensagem", value: "{{mensagem}}" },
  ];

  function showVariables(index) {
    currentPropIndex.value = index;
    showVars.value = true;
  }

  function insertVariable(variable) {
    console.log(variable);
    if (currentPropIndex.value === null || !selectedNode.value) {
      return;
    }

    selectedNode.value.props[currentPropIndex.value].v += variable;

    showVars.value = false;
  }
  async function apiFetch(path, options = {}) {
    const headers = {
      Authorization: `Bearer ${token.value}`,
      ...options.headers,
    };

    // Só adiciona Content-Type se:
    // 1. Não for FormData
    // 2. Tiver um body (não for GET/HEAD/DELETE sem body)
    // 3. O body não for null/undefined
    // 4. Não tiver Content-Type especificado nas options
    const hasBody = options.body && !(options.body instanceof FormData);
    const isGetOrHead = options.method === "GET" || options.method === "HEAD";

    if (hasBody && !isGetOrHead && !options.headers?.["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    const res = await fetch(`${URL_BASE}/api/v1${path}`, {
      headers,
      ...options,
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
  // ── Funções ──

  async function abrirModalPrompts() {
    showModalPrompts.value = true;
    promptEditando.value = null;
    await buscarPrompts();
  }

  function fecharModalPrompts() {
    showModalPrompts.value = false;
    promptEditando.value = null;
  }

  async function buscarPrompts() {
    carregandoPrompts.value = true;
    try {
      const resp = await apiFetch("/flows/aiPrompt");

      promptsDisponiveis.value = resp;
    } catch (e) {
      console.error("Erro ao buscar prompts:", e);
    } finally {
      carregandoPrompts.value = false;
    }
  }

  function novoPrompt() {
    promptEditando.value = { id: null, name: "", content: "" };
  }

  function editarPrompt(p) {
    // cópia para não editar a lista direto
    promptEditando.value = { ...p };
  }

  async function salvarPrompt() {
    if (!promptEditando.value) return;
    const { id, name, content } = promptEditando.value;

    if (!name.trim() || !content.trim()) return;

    salvandoPrompt.value = true;
    try {
      if (id) {
        // atualizar
        const resp = await apiFetch(`/flows/aiPrompt/${id}`, {
          method: "PUT",
          body: JSON.stringify({ name, content }),
        });

        const idx = promptsDisponiveis.value.findIndex((p) => p.id === id);
        if (idx !== -1) promptsDisponiveis.value[idx] = resp;
      } else {
        // criar
        const resp = await apiFetch(`/flows/aiPrompt`, {
          method: "POST",
          body: JSON.stringify({ name, content }),
        });

        promptsDisponiveis.value.unshift(resp);
      }
      promptEditando.value = null;
    } catch (e) {
      console.error("Erro ao salvar prompt:", JSON.stringify(e, null, 2));
    } finally {
      salvandoPrompt.value = false;
    }
  }

  async function deletarPrompt(id) {
    if (!window.confirm("Excluir este prompt?")) return;
    try {
      await apiFetch(`/flows/aiPrompt/${id}`, { method: "DELETE" });
      promptsDisponiveis.value = promptsDisponiveis.value.filter(
        (p) => p.id !== id,
      );
    } catch (e) {
      console.error("Erro ao deletar prompt:", e);
    }
  }
  /* ── Helpers ── */
  function setBadge(nodeId, cls, text) {
    const el = document.querySelector(`#node-${nodeId} .n-badge`);
    if (!el) return;
    el.className = "n-badge " + cls;
    el.textContent = text;
  }

  function parseInterval(interval) {
    const match = interval.trim().match(/^(\d+)\s*(s|min|m|h|d)$/i);
    if (!match) throw new Error(`Intervalo inválido: ${interval}`);
    const value = Number(match[1]);
    const unit = match[2].toLowerCase();
    const multipliers = {
      s: 1000,
      m: 60000,
      min: 60000,
      h: 3600000,
      d: 86400000,
    };
    return value * multipliers[unit];
  }

  /* ── Módulos ── */
  function criarModulo(nome, protegido = false) {
    if (!editor) return;
    nome = (nome || "").trim();
    if (!nome || modulos.value.some((m) => m.nome === nome)) return;
    editor.addModule(nome);
    modulos.value.push({ nome, protegido });
    trocarModulo(nome);
  }

  function trocarModulo(nome) {
    if (!editor) return;
    editor.changeModule(nome);
    moduloAtivo.value = nome;
  }

  function removerModulo(nome) {
    if (!editor || nome === "Home") return;

    const mod = modulos.value.find((m) => m.nome === nome);
    if (mod?.protegido) {
      sonnerAlert?.warning?.(
        "Este módulo está protegido e não pode ser excluído.",
      );
      return;
    }

    if (
      !window.confirm(
        `Excluir o módulo "${nome}"? Todo o fluxo dentro dele será perdido.`,
      )
    ) {
      return;
    }

    editor.removeModule(nome);
    modulos.value = modulos.value.filter((m) => m.nome !== nome);
    trocarModulo("Home");
  }
  /* ── Modal de módulo (criar/editar) ── */
  function abrirModalModulo(modExistente = null) {
    moduloErro.value = "";

    if (modExistente) {
      const m = modulos.value.find((x) => x.nome === modExistente);
      console.log(m);
      moduloEditando.value = {
        nome: modExistente,
        original: modExistente,
        protegido: !!m?.protegido,
      };
    } else {
      moduloEditando.value = { nome: "", original: null, protegido: false };
    }
    showModalModulo.value = true;
  }

  function fecharModalModulo() {
    showModalModulo.value = false;
    moduloEditando.value = { nome: "", original: null };
    moduloErro.value = "";
  }

  function salvarModulo() {
    if (!editor) return;

    const nome = (moduloEditando.value.nome || "").trim();
    const original = moduloEditando.value.original;

    if (!nome) {
      moduloErro.value = "Informe um nome.";
      return;
    }

    // valida duplicidade (ignorando o próprio em edição)
    const jaExiste = modulos.value.some(
      (m) => m.nome === nome && m.nome !== original,
    );
    if (jaExiste) {
      moduloErro.value = "Já existe um módulo com esse nome.";
      return;
    }

    if (original) {
      if (original === "Home") {
        moduloErro.value = "O módulo Home não pode ser renomeado.";
        return;
      }

      // exporta tudo, troca a chave do módulo, reimporta
      const exported = editor.export();
      if (!exported.drawflow[original]) {
        moduloErro.value = "Módulo não encontrado no editor.";
        return;
      }

      // renomeia a chave preservando a ordem
      const novoDrawflow = {};
      Object.keys(exported.drawflow).forEach((key) => {
        novoDrawflow[key === original ? nome : key] = exported.drawflow[key];
      });
      exported.drawflow = novoDrawflow;

      // limpa e reimporta
      editor.clear();
      editor.import(exported);

      // atualiza lista/ativo
      const idx = modulos.value.findIndex((m) => m.nome === original);
      if (idx !== -1) {
        modulos.value[idx] = {
          nome,
          protegido: moduloEditando.value.protegido,
        };
      }
    } else {
      // CRIAR
      criarModulo(nome, moduloEditando.value.protegido);
    }

    fecharModalModulo();
  }
  /* ── mounted ── */
  onMounted(async () => {
    await nextTick();

    const container = document.getElementById("drawflow");
    if (!container) {
      console.error("useFlow: #drawflow não encontrado no DOM");
      return;
    }

    editor = new Drawflow(container);
    editor.reroute = true;
    editor.reroute_fix_curvature = true;
    editor.force_first_input = false;
    editor.start();
    df.value = editor;

    /* duplo-clique abre modal */
    container.addEventListener("dblclick", (e) => {
      const nodeElement = e.target.closest(".drawflow-node");
      if (!nodeElement) return;
      const id = nodeElement.id.slice(5);
      const data = editor.getNodeFromId(id);
      selectedNode.value = { id, ...data.data };
      showModal.value = true;
    });

    /* fechar modal só quando não há nó selecionado E modal não foi aberto por dblclick */
    editor.on("nodeUnselected", () => {
      // não fecha automaticamente — o usuário fecha com Cancelar/Salvar/clique fora
    });

    // /* nós iniciais */
    // addNode(PALETTE[0], { x: 80, y: 180 });
    // addNode(PALETTE[2], { x: 360, y: 80 });
    // addNode(PALETTE[5], { x: 360, y: 280 });

    // setTimeout(() => {
    //   try {
    //     editor.addConnection(1, 2, "output_1", "input_1");
    //     editor.addConnection(2, 3, "output_1", "input_1");
    //   } catch (e) {
    //     console.warn("Conexão falhou:", e);
    //   }
    // }, 150);
  });

  /* ── Nós ── */
  function addNode(p, pos) {
    if (!editor) return;
    const id = editor.addNode(
      p.type,
      p.inputs,
      p.outputs,
      pos.x,
      pos.y,
      "n8n-custom",
      { ...p },
      nodeHTML(p),
      false,
    );
    return id;
  }

  function onDragStart(e, p) {
    _drag = p;
  }

  function onDrop(e) {
    if (!_drag || !editor) return;
    const container = document.getElementById("drawflow");
    const rect = container.getBoundingClientRect();
    const zoom = editor.zoom;
    const x = (e.clientX - rect.left - editor.canvas_x) / zoom;
    const y = (e.clientY - rect.top - editor.canvas_y) / zoom;
    addNode(_drag, { x, y });
    _drag = null;
  }

  /* ── Canvas controls ── */
  function clearFlow() {
    if (!editor) return;
    editor.clearModuleSelected();
  }

  function zoomReset() {
    if (!editor) return;
    editor.zoom = 1;
    editor.canvas_x = 0;
    editor.canvas_y = 0;
    editor.zoom_refresh();
  }

  /* ── Execução ── */
  function runFlow() {
    if (!editor) return;
    const exported = editor.export();
    // usa o módulo ativo, não Home fixo
    const nodes = exported.drawflow[moduloAtivo.value]?.data;
    if (!nodes) return;

    const entryIds = Object.keys(nodes).filter(
      (id) =>
        Object.keys(nodes[id].inputs).length === 0 ||
        Object.values(nodes[id].inputs).every(
          (i) => i.connections.length === 0,
        ),
    );

    for (const id of entryIds) {
      executeNode(id, nodes, {});
    }
  }
  async function executarModulo(nomeModulo, dadoExterno = null) {
    if (!editor) return;
    const exported = editor.export();
    const nodes = exported.drawflow[nomeModulo]?.data;
    if (!nodes) return;

    const triggerId = Object.keys(nodes).find(
      (id) => nodes[id].name === "trigger",
    );
    if (!triggerId) return;

    await executeNode(triggerId, nodes, { data: dadoExterno });
  }
  async function runFlowComDados(dadoExterno) {
    if (!editor) return;
    const exported = editor.export();
    const nodes = exported.drawflow[moduloAtivo.value]?.data;
    if (!nodes) return;

    const triggerId = Object.keys(nodes).find(
      (id) => nodes[id].name === "trigger",
    );
    if (!triggerId) return;

    await executeNode(triggerId, nodes, { data: dadoExterno });
  }

  async function executeNode(id, nodes, context) {
    const node = nodes[id];
    const type = node.name;
    const data = node.data;

    setBadge(id, "st-running", "⟳ Rodando");

    let result = context?.data ?? null;

    try {
      // if (type === "trigger") {
      //   const intervalo = data.props.find((p) => p.k === "Intervalo")?.v;
      //   result = await new Promise((resolve) => {
      //     setTimeout(() => resolve(context.data), parseInterval(intervalo));
      //   });
      // } else if (type === "http") {
      //   const url = data.props.find((p) => p.k === "URL")?.v;
      //   const resp = await fetch(url);
      //   result = await resp.json();
      // } else if (type === "processarIa") {
      //   const engine = await initAI();
      //   const contato = context.data.contato;
      //   const response = await engine.chat.completions.create({
      //     messages: [
      //       {
      //         role: "system",
      //         content: "Você é um assistente de atendimento.",
      //       },
      //       {
      //         role: "user",
      //         content: context.data.messages[0].body,
      //       },
      //     ],
      //   });
      //   const mensagem = response.choices[0].message.content;

      //   result = { contato, mensagem };
      // } else if (type === "sendMsg") {
      //   let numero = data.props.find((p) => p.k === "Numero")?.v;
      //   let mensagem = data.props.find((p) => p.k === "Mensagem")?.v;
      //   if (!!numero == false) {
      //     // TODO pegar dados do Ai

      //     numero = context.data.contato;
      //     mensagem = context.data.mensagem;
      //   }
      //   const formData = new FormData();
      //   formData.append("to", numero);
      //   formData.append("body", mensagem || "");

      //   const sendUrl = `${URL_BASE}/api/v1/channel/18/send`;
      //   const message = await fetch(sendUrl, {
      //     method: "POST",
      //     body: formData,
      //     headers: { Authorization: `Bearer ${token.value}` },
      //   });
      //   result = { messagem: "Enviada" };
      // } else if (type === "filter") {
      //   result = Array.isArray(context.data)
      //     ? context.data.filter((item) => item.status === "open")
      //     : "Fechado";
      // } else if (type === "transform") {
      //   result = context.data;
      // } else if (type === "db") {
      //   console.log("Salvaria no banco:", context.data);
      //   result = context.data;
      // } else if (type === "notify") {
      //   console.log("Notificaria:", context.data);
      //   result = null;
      // }

      setBadge(id, "st-success", "✓ Concluído");
    } catch (e) {
      setBadge(id, "st-error", "✕ Erro");
      console.error(`Erro no nó ${id} (${type}):`, e);
      return;
    }

    const outputs = Object.values(node.outputs || {});
    for (const output of outputs) {
      for (const conn of output.connections) {
        await executeNode(conn.node, nodes, { data: result });
      }
    }
  }

  /* ── Modal de edição ── */
  function saveNode() {
    if (!selectedNode.value || !editor) return;
    const { id, ...data } = selectedNode.value;

    editor.updateNodeDataFromId(id, data);

    // atualiza HTML no drawflow interno e no DOM
    const html = nodeHTML(data);
    const modData = editor.drawflow.drawflow[moduloAtivo.value].data;
    if (modData[id]) modData[id].html = html;

    const nodeEl = document.querySelector(`#node-${id} .drawflow_content_node`);
    if (nodeEl) nodeEl.innerHTML = html;

    showModal.value = false;
    selectedNode.value = null;
  }

  /* ── Persistência ── */
  function salvarLocal() {
    if (!editor) return;
    localStorage.setItem("flow_salvo", JSON.stringify(editor.export()));
  }

  function carregarLocal() {
    const raw = localStorage.getItem("flow_salvo");
    if (!raw || !editor) return;
    editor.import(JSON.parse(raw));
    // sincroniza lista de módulos
    const imported = JSON.parse(raw);
    modulos.value = Object.keys(imported.drawflow).map((nome) => ({
      nome,
      protegido: nome === "Home",
    }));
    flowAtual.value = null;
  }

  async function salvarFlow(nome) {
    if (!editor) return;
    const exportado = editor.export();
    exportado.__modulosMeta = modulos.value.map((m) => ({
      nome: m.nome,
      protegido: m.protegido,
    }));
    const payload = {
      nome,
      modulo: moduloAtivo.value,
      flow: exportado,
    };

    const id = flowAtual.value?.id;

    const resp = await fetch(
      id ? `${URL_BASE}/api/v1/flows/${id}` : `${URL_BASE}/api/v1/flows`,
      {
        method: id ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token.value}`,
        },
        body: JSON.stringify(payload),
      },
    );

    const saved = await resp.json();

    // guarda o flow atual para próximos salvamentos
    flowAtual.value = { id: saved.id, nome: saved.nome ?? nome };

    return saved;
  }
  async function promptSalvar() {
    if (salvandoFlow.value) return;

    // já existe → salva direto, sem perguntar
    if (flowAtual.value?.id) {
      salvandoFlow.value = true;
      try {
        await salvarFlow(flowAtual.value.nome);
        sonnerAlert?.success?.("Flow atualizado com sucesso.");
      } catch (e) {
        console.error("Erro ao salvar flow:", e);
        sonnerAlert?.error?.("Erro ao salvar flow.");
      } finally {
        salvandoFlow.value = false;
      }
      return;
    }

    // novo → pergunta o nome
    const nome = (window.prompt("Nome do flow:") || "").trim();
    if (!nome) return;

    salvandoFlow.value = true;
    try {
      await salvarFlow(nome);
      sonnerAlert?.success?.("Flow criado com sucesso.");
    } catch (e) {
      console.error("Erro ao salvar flow:", e);
      sonnerAlert?.error?.("Erro ao salvar flow.");
    } finally {
      salvandoFlow.value = false;
    }
  }
  async function abrirModalCarregar() {
    showModalCarregar.value = true;
    carregandoFlows.value = true;
    try {
      const resp = await fetch(`${URL_BASE}/api/v1/flows/`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token.value}`,
        },
      });
      flowsDisponiveis.value = await resp.json();
    } catch (e) {
      console.error("Erro ao listar flows:", e);
    } finally {
      carregandoFlows.value = false;
    }
  }

  async function carregarFlow(id) {
    if (!editor) return;
    try {
      const resp = await fetch(`${URL_BASE}/api/v1/flows/${id}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token.value}`,
        },
      });
      const record = await resp.json();
      const flowJson = record.flow_json;

      // 1. OBRIGATÓRIO: Limpar o editor ANTES de importar o novo!
      // Isso remove os módulos do flow anterior da tela.
      editor.clear();

      // 2. Re-gera o HTML dos nós
      const modData = flowJson.drawflow || {};
      Object.keys(modData).forEach((modulo) => {
        const nodes = modData[modulo]?.data || {};
        Object.keys(nodes).forEach((nodeId) => {
          const nodeData = nodes[nodeId].data;
          if (nodeData) {
            nodes[nodeId].html = nodeHTML(nodeData);
          }
        });
      });

      // 3. Importa o flow
      editor.import(flowJson);

      // 4. Monta a lista de módulos (com meta nova ou fallback para antigos)
      const meta = flowJson.__modulosMeta ?? null;
      const nomes = Object.keys(flowJson.drawflow || {});

      if (Array.isArray(meta) && meta.length) {
        modulos.value = nomes.map((nome) => {
          const m = meta.find((x) => x.nome === nome);
          return {
            nome,
            protegido: nome === "Home" ? true : !!m?.protegido,
          };
        });
      } else {
        // Fallback: para flows antigos (sem meta)
        modulos.value = nomes.map((nome) => ({
          nome,
          protegido: nome === "Home",
        }));
      }

      // 5. Força o módulo ativo a ser a String correta
      const moduloInicial = nomes.includes("Home")
        ? "Home"
        : nomes[0] || "Home";
      moduloAtivo.value = moduloInicial;
      editor.changeModule(moduloInicial);

      flowAtual.value = { id: record.id, nome: record.nome };
      showModalCarregar.value = false;
    } catch (e) {
      console.error("Erro ao carregar flow:", e);
    }
  }

  async function deletarFlow(id) {
    const confirmar = window.confirm("Excluir este flow?");
    if (!confirmar) return;

    try {
      await fetch(`${URL_BASE}/api/v1/flows/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token.value}`,
        },
      });
      // remove da lista sem precisar buscar de novo
      flowsDisponiveis.value = flowsDisponiveis.value.filter(
        (f) => f.id !== id,
      );
    } catch (e) {
      console.error("Erro ao deletar flow:", e);
    }
  }

  async function ativarFlow(id) {
    if (ativandoFlowId.value) return;
    ativandoFlowId.value = id;

    try {
      const resp = await fetch(`${URL_BASE}/api/v1/flows/${id}/activate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.value}`,
        },
      });

      const body = await resp.json().catch(() => null);
      if (!resp.ok) {
        throw new Error(body?.error || body?.message || "Falha ao ativar Flow");
      }

      flowsDisponiveis.value = flowsDisponiveis.value.map((flow) => ({
        ...flow,
        ativo: flow.id === id,
      }));
    } catch (e) {
      console.error("Erro ao ativar flow:", e);
    } finally {
      ativandoFlowId.value = null;
    }
  }

  async function listarFlows() {
    const resp = await fetch(`${URL_BASE}/api/v1/flows`);
    return await resp.json();
  }
  /* ── Watch tickets externos ── */
  // watch(
  //   ticketNovo,
  //   (novoValor) => {
  //     if (novoValor.isNew) {
  //       executarModulo("Home", novoValor);
  //     }
  //   },
  //   { deep: true },
  // );

  /* ── Return ── */
  return {
    palette,
    df,
    selectedNode,
    showModal,
    modulos,
    moduloAtivo,
    onDragStart,
    onDrop,
    clearFlow,
    zoomReset,
    runFlow,
    saveNode,
    criarModulo,
    trocarModulo,
    removerModulo,
    salvarLocal,
    carregarLocal,
    salvarFlow,
    carregarFlow,
    showModalCarregar,
    flowsDisponiveis,
    carregandoFlows,
    ativandoFlowId,
    abrirModalCarregar,
    carregarFlow,
    deletarFlow,
    ativarFlow,
    showVars,
    variables,
    showVariables,
    insertVariable,
    currentPropIndex,
    showModalPrompts,
    promptsDisponiveis,
    carregandoPrompts,
    promptEditando,
    salvandoPrompt,
    abrirModalPrompts,
    fecharModalPrompts,
    novoPrompt,
    editarPrompt,
    salvarPrompt,
    deletarPrompt,
    showModalModulo,
    moduloEditando,
    moduloErro,
    abrirModalModulo,
    fecharModalModulo,
    salvarModulo,
    flowAtual,
    salvandoFlow,
    promptSalvar,
  };
}
