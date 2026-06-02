function useFlow(sonnerAlert) {
  const { ref, onMounted, nextTick } = Vue; // ← nextTick adicionado

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

  const PALETTE = [
    {
      type: "trigger",
      label: "Trigger",
      icon: "⚡",
      color: "#ff9f0a",
      sub: "Início do fluxo",
      props: [{ k: "Intervalo", v: "1 min" }],
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
        { k: "Campo", v: "dy" },
        { k: "Op.", v: "> 0.08" },
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

  let _drag = null;
  let editor = null; // ← fora do ref, evita reatividade desnecessária
  const selectedNode = ref(null);
  const showModal = ref(false);
  const palette = PALETTE;
  const df = ref(null); // ← mantido só para o template checar se existe

  function setBadge(nodeId, cls, text) {
    const el = document.querySelector(`#node-${nodeId} .n-badge`);
    if (!el) return;
    el.className = "n-badge " + cls;
    el.textContent = text;
  }

  onMounted(async () => {
    await nextTick();

    // ← pega pelo id, não pelo ref no div errado
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
    container.addEventListener("dblclick", (e) => {
      const nodeElement = e.target.closest(".drawflow-node");
      if (nodeElement) {
        // Extrai o ID (o Drawflow usa o formato "node-ID")
        const id = nodeElement.id.slice(5);

        // Agora você pode usar os métodos do editor normalmente
        const data = editor.getNodeFromId(id);

        // Sua lógica original:
        selectedNode.value = { id, ...data.data };
        showModal.value = true;
      }
    });

    editor.on("nodeDblclick", (id) => {
      const data = editor.getNodeFromId(id);
      selectedNode.value = { id, ...data.data };
      showModal.value = true;
    });

    editor.on("nodeUnselected", () => {
      showModal.value = false;
      selectedNode.value = null;
    });
    editor.on("connectionCreated", ({ output_id, input_id }) => {
      console.log(`Conectou nó ${output_id} → ${input_id}`);
    });

    editor.on("connectionRemoved", ({ output_id, input_id }) => {
      console.log(`Removeu conexão ${output_id} → ${input_id}`);
    });
    df.value = editor;

    // addNode(PALETTE[0], { x: 80, y: 180 });
    // addNode(PALETTE[1], { x: 360, y: 80 });
    // addNode(PALETTE[2], { x: 360, y: 280 });
    // addNode(PALETTE[3], { x: 630, y: 180 });
    // addNode(PALETTE[4], { x: 900, y: 80 });
    // addNode(PALETTE[5], { x: 900, y: 280 });

    // setTimeout(() => {
    //   try {
    //     editor.addConnection(1, 2, "output_1", "input_1");
    //     editor.addConnection(1, 3, "output_1", "input_1");
    //     editor.addConnection(2, 4, "output_1", "input_1");
    //     editor.addConnection(3, 4, "output_1", "input_1");
    //     editor.addConnection(4, 5, "output_1", "input_1");
    //     editor.addConnection(4, 6, "output_1", "input_1");
    //   } catch (e) {
    //     console.warn("Conexão falhou:", e);
    //   }
    // }, 150);
  });

  function addNode(p, pos) {
    if (!editor) return;
    const html = nodeHTML(p);
    const id = editor.addNode(
      p.type,
      p.inputs,
      p.outputs,
      pos.x,
      pos.y,
      "n8n-custom",
      { ...p },
      html,
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

  function clearFlow() {
    editor && editor.clearModuleSelected();
  }

  function zoomReset() {
    if (!editor) return;
    editor.zoom = 1;
    editor.canvas_x = 0;
    editor.canvas_y = 0;
    editor.zoom_refresh();
  }

  function runFlow() {
    if (!editor) return;
    const data = editor.export();
    const ids = Object.keys(data.drawflow.Home.data);
    const nodes = data.drawflow.Home.data;

    // ids.forEach((id) => setBadge(id, "st-running", "⟳ Rodando"));
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
    // setTimeout(() => {
    //   ids.forEach((id) => setBadge(id, "st-success", "✓ Concluído"));
    // }, 2200);
  }
  async function executeNode(id, nodes, context) {
    const node = nodes[id];
    const type = node.name;
    const data = node.data;

    setBadge(id, "st-running", "⟳ Rodando");

    let result = null;

    // ── aqui você define o que cada tipo faz ──
    if (type === "trigger") {
      const intervalo = data.props.find((item) => item.k === "Intervalo")?.v;
      result = await new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            triggered: true,
            timestamp: new Date().toISOString(),
          });
        }, parseInterval(intervalo));
      });
    } else if (type === "http") {
      try {
        const url = data.props.find((p) => p.k === "URL")?.v;

        const resp = await fetch(url);

        result = await resp.json();
      } catch (e) {
        setBadge(id, "st-error", "✕ Erro");
        return;
      }
    } else if (type === "filter") {
      // exemplo: filtra array pelo campo dy
      result = Array.isArray(context.data)
        ? context.data.filter((item) => item.dy > 0.08)
        : "ERRO";
    } else if (type === "transform") {
      result = context.data; // transforme como quiser
    } else if (type === "db") {
      console.log("Salvaria no banco:", context.data);
      result = context.data;
    } else if (type === "notify") {
      console.log("Notificaria:", context.data);
      sonnerAlert("ALERTA CHAT");
      result = null;
    }

    setBadge(id, "st-success", "✓ Concluído");

    // percorre os filhos conectados
    const outputs = Object.values(node.outputs || {});
    for (const output of outputs) {
      for (const conn of output.connections) {
        await executeNode(conn.node, nodes, { data: result });
      }
    }
  }
  function parseInterval(interval) {
    const match = interval.trim().match(/^(\d+)\s*(s|min|m|h|d)$/i);

    if (!match) {
      throw new Error(`Intervalo inválido: ${interval}`);
    }

    const value = Number(match[1]);
    const unit = match[2].toLowerCase();

    const multipliers = {
      s: 1000,
      m: 60 * 1000,
      min: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return value * multipliers[unit];
  }
  function saveNode() {
    if (!selectedNode.value || !editor) return;
    const { id, ...data } = selectedNode.value;
    editor.updateNodeDataFromId(id, data);
    // atualiza o HTML interno do nó
    const html = nodeHTML(data);

    editor.drawflow.drawflow.Home.data[id].html = html;

    // re-renderiza o nó no DOM
    const nodeEl = document.querySelector(`#node-${id} .drawflow_content_node`);
    if (nodeEl) nodeEl.innerHTML = html;

    showModal.value = false;
    selectedNode.value = null;
  }
  return {
    palette,
    df,
    onDragStart,
    onDrop,
    clearFlow,
    zoomReset,
    runFlow,
    selectedNode,
    showModal,
    saveNode,
  };
}
