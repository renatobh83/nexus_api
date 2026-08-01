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
        { k: "Mensagem", v: "" },
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

  const palette = PALETTE;
  const df = ref(null);
  const selectedNode = ref(null);
  const showModal = ref(false);
  const modulos = ref(["Home"]);
  const moduloAtivo = ref("Home");

  const showModalCarregar = ref(false);
  const flowsDisponiveis = ref([]);
  const carregandoFlows = ref(false);

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
  function criarModulo(nome) {
    if (!editor || modulos.value.includes(nome)) return;
    editor.addModule(nome);
    modulos.value.push(nome);
    trocarModulo(nome);
  }

  function trocarModulo(nome) {
    if (!editor) return;
    editor.changeModule(nome);
    moduloAtivo.value = nome;
  }

  function removerModulo(nome) {
    if (!editor || nome === "Home") return;
    editor.removeModule(nome);
    modulos.value = modulos.value.filter((m) => m !== nome);
    trocarModulo("Home");
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

    let result = null;

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
    modulos.value = Object.keys(imported.drawflow);
  }

  async function salvarFlow(nome) {
    if (!editor) return;

    const resp = await fetch(`${URL_BASE}/api/v1/flows`, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.value}`,
      },
      body: JSON.stringify({
        nome,
        modulo: moduloAtivo.value,
        flow: editor.export(),
      }),
    });
    const saved = await resp.json();

    return saved;
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

      // re-gera o HTML de cada nó antes de importar
      const modData = flowJson.drawflow;
      Object.keys(modData).forEach((modulo) => {
        const nodes = modData[modulo].data;
        Object.keys(nodes).forEach((nodeId) => {
          const nodeData = nodes[nodeId].data; // o { ...p } que você salvou
          if (nodeData) {
            nodes[nodeId].html = nodeHTML(nodeData); // ← re-renderiza com CSS atual
          }
        });
      });

      editor.import(flowJson);
      modulos.value = Object.keys(flowJson.drawflow);
      moduloAtivo.value = modulos.value[0] || "Home";
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
    abrirModalCarregar,
    carregarFlow,
    deletarFlow,
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
  };
}
