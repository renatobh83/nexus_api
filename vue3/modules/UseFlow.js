function useFlow({ allTickets, URL_BASE, token, sonnerAlert }) {
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
        <div class="n-badge st-idle">· Aguardando</div>
      </div>
    </div>`;
  }

  /* ── Palette ── */
  const PALETTE = [
    {
      type: "trigger",
      label: "Trigger",
      icon: "⚡",
      color: "#ff9f0a",
      sub: "Início do fluxo",
      props: [{ k: "Intervalo", v: "10 s" }],
      inputs: 0,
      outputs: 1,
    },
    {
      type: "http",
      label: "HTTP Request",
      icon: "🌐",
      color: "#0a84ff",
      sub: "GET / POST",
      props: [
        { k: "Método", v: "GET" },
        { k: "URL", v: "/api/fiis" },
      ],
      inputs: 1,
      outputs: 1,
    },
    {
      type: "filter",
      label: "Filtro IF",
      icon: "⚖️",
      color: "#bf5af2",
      sub: "Condição lógica",
      props: [
        { k: "Campo", v: "status" },
        { k: "Op.", v: "open" },
      ],
      inputs: 1,
      outputs: 1,
    },
    {
      type: "transform",
      label: "Transformar",
      icon: "🔀",
      color: "#32d74b",
      sub: "Mapear dados",
      props: [
        { k: "Entrada", v: "JSON" },
        { k: "Saída", v: "Array" },
      ],
      inputs: 1,
      outputs: 1,
    },
    {
      type: "db",
      label: "Banco de Dados",
      icon: "🗄️",
      color: "#34c759",
      sub: "SQL / NoSQL",
      props: [
        { k: "Tabela", v: "fiis_score" },
        { k: "Op.", v: "UPSERT" },
      ],
      inputs: 1,
      outputs: 1,
    },
    {
      type: "notify",
      label: "Notificação",
      icon: "🔔",
      color: "#ff6d5a",
      sub: "Email / Slack",
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

    /* nós iniciais */
    addNode(PALETTE[0], { x: 80, y: 180 });
    addNode(PALETTE[2], { x: 360, y: 80 });
    addNode(PALETTE[5], { x: 360, y: 280 });

    setTimeout(() => {
      try {
        editor.addConnection(1, 2, "output_1", "input_1");
        editor.addConnection(2, 3, "output_1", "input_1");
      } catch (e) {
        console.warn("Conexão falhou:", e);
      }
    }, 150);
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
      if (type === "trigger") {
        const intervalo = data.props.find((p) => p.k === "Intervalo")?.v;
        result = await new Promise((resolve) => {
          setTimeout(() => resolve(context.data), parseInterval(intervalo));
        });
      } else if (type === "http") {
        const url = data.props.find((p) => p.k === "URL")?.v;
        const resp = await fetch(url);
        result = await resp.json();
      } else if (type === "filter") {
        result = Array.isArray(context.data)
          ? context.data.filter((item) => item.status === "open")
          : "Fechado";
      } else if (type === "transform") {
        result = context.data;
      } else if (type === "db") {
        console.log("Salvaria no banco:", context.data);
        result = context.data;
      } else if (type === "notify") {
        console.log("Notificaria:", context.data);
        result = null;
      }

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
    console.log("Flow salvo:", saved);
    return saved;
  }

  async function carregarFlow(id) {
    if (!editor) return;
    const resp = await fetch(`/flows/${id}`);
    const record = await resp.json();
    editor.import(record.flow_json);
    modulos.value = Object.keys(record.flow_json.drawflow);
    moduloAtivo.value = modulos.value[0] || "Home";
  }

  async function listarFlows() {
    const resp = await fetch("/api/flows");
    return await resp.json();
  }
  /* ── Watch tickets externos ── */
  watch(
    allTickets,
    (novoValor) => {
      executarModulo("Home", novoValor);
    },
    { deep: true },
  );

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
  };
}
