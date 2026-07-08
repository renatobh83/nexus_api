/**
 * @file useTickets.js
 * @description Composable para gerenciamento de tickets e mensagens.
 */
function useTickets({
  URL_BASE,
  token,
  currentUser,
  socket,
  sonnerAlert,
  channels,
  sidebarOpen,
}) {
  const { ref, computed, nextTick } = Vue;

  // --- Estado ---
  const allTickets = ref([]);
  const currentTicket = ref(null);
  const searchTerm = ref("");
  const showOnlyClosed = ref(false);
  const loadingTickets = ref(false);
  const buscarPalavras = ref("");
  const updatedTickets = ref({});

  const currentMessages = ref([]);
  const newMessageText = ref("");
  const loadingMessages = ref(false);
  const tempMessages = ref([]);
  const assinarMensagem = ref(false);

  const fileInput = ref(null);
  const selectedFiles = ref([]);

  // --- Computed ---

  /**
   * Tickets filtrados por busca, status e visibilidade do usuário logado.
   */
  const filteredTickets = computed(() => {
    return allTickets.value
      .filter((ticket) => {
        const isOwnOrPending =
          ticket.status === "pending" ||
          ticket.userId === currentUser.value?.id ||
          currentUser.value.role === "administrador";

        const matchesSearch = (ticket.owner || ticket.name || "")
          .toLowerCase()
          .includes(searchTerm.value.toLowerCase());
        const matchesStatus = showOnlyClosed.value
          ? ticket.status === "closed"
          : ticket.status !== "closed";
        const notIntercao = !ticket.isInteraction;

        return isOwnOrPending && matchesSearch && matchesStatus && notIntercao;
      })
      .sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));
  });

  /**
   * Mensagens do ticket atual ordenadas por data de criação (crescente).
   */
  const allMessages = computed(() =>
    [...currentMessages.value].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    ),
  );

  // --- Funções ---

  /** Rola a área de mensagens para o final. */
  const scrollToBottom = (ticketId = null) => {
    if (
      ticketId &&
      currentTicket?.value?.id &&
      ticketId !== currentTicket.value.id
    )
      return;
    const area = document.querySelector(".messages-area");
    if (!area) return;

    area.scrollTop = area.scrollHeight;

    const images = area.querySelectorAll("img");
    images.forEach((img) => {
      if (!img.complete) {
        img.addEventListener(
          "load",
          () => {
            area.scrollTop = area.scrollHeight;
          },
          { once: true },
        );
        img.addEventListener(
          "error",
          () => {
            area.scrollTop = area.scrollHeight;
          },
          { once: true },
        );
      }
    });

    let resizeTimeout;
    const resizeObserver = new ResizeObserver(() => {
      area.scrollTop = area.scrollHeight;
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => resizeObserver.disconnect(), 1000);
    });
    resizeObserver.observe(area);
  };

  /**
   * Substitui (ou insere) um ticket na lista local.
   * @param {object} updatedTicket
   */
  function updateSingleTicket(updatedTicket) {
    const index = allTickets.value.findIndex((t) => t.id === updatedTicket.id);
    if (index !== -1) {
      allTickets.value[index] = {
        ...allTickets.value[index],
        ...updatedTicket,
      };
    } else {
      allTickets.value.unshift(updatedTicket);
    }
  }

  /**
   * Carrega todos os tickets da API.
   */
  const loadTickets = async () => {
    loadingTickets.value = true;
    try {
      const res = await fetch(`${URL_BASE}/api/v1/tickets`, {
        headers: { Authorization: `Bearer ${token.value}` },
      });
      const data = await res.json();

      allTickets.value = (data.tickets || data || []).sort(
        (a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0),
      );
    } catch (e) {
      allTickets.value = [];
      console.log("Erro ao carregar tickets:", e);
    } finally {
      loadingTickets.value = false;
    }
  };
  const loadQuotedMsg = (quotedMsgId) => {
    const messageRespondida = currentMessages.value.find(
      (m) => m.messageId === quotedMsgId,
    );
    return messageRespondida.body;
  };
  /**
   * Carrega as mensagens de um ticket específico.
   * @param {number|string} ticketId
   */
  const loadMessages = async (ticketId) => {
    tempMessages.value = [];
    const ticket = allTickets.value.find((t) => t.id === ticketId);
    if (ticket && ticket.messages) {
      currentMessages.value = [...ticket.messages].sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      );
    } else {
      currentMessages.value = [];
    }
    await nextTick();
    scrollToBottom(ticketId);
  };

  /**
   * Seleciona um ticket e carrega suas mensagens.
   * @param {number|string} ticketId
   */
  const selectTicket = async (ticketId) => {
    sidebarOpen.value = !sidebarOpen.value;
    if (currentTicket.value?.id === ticketId) return;
    currentTicket.value = allTickets.value.find((t) => t.id === ticketId);
    if (!currentTicket.value) return;

    loadingMessages.value = true;
    loadMessages(ticketId);
    loadingMessages.value = false;
    await nextTick();
    scrollToBottom();
  };

  /**
   * Atualiza o status de um ticket via API.
   * @param {number|string} id
   * @param {string} status
   * @param {string} msg
   */
  async function updateTicketStatus(id, status, msg) {
    try {
      const payload = { ...currentUser.value, status };
      if (socket.value && id) {
        socket.value.emit("join-ticket", id);
      }

      const response = await fetch(`${URL_BASE}/api/v1/tickets/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token.value}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const updatedData = await response.json();
        updateSingleTicket(updatedData);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }

      if (currentTicket.value?.id === id) {
        await loadMessages(id);
      }
    } catch (error) {
      console.error("Erro ao atualizar ticket:", error);
      sonnerAlert("Não foi possível atualizar o ticket.", false);
    } finally {
      updatedTickets.value[id] = false;
    }
  }

  /** Inicia o atendimento de um ticket (status → 'open'). */
  async function attendTicket(id) {
    updatedTickets.value[id] = true;
    await updateTicketStatus(id, "open", "🎧 Ticket em atendimento");
    sonnerAlert("🎧 Ticket em atendimento");
  }

  /** Reabre um ticket finalizado (status → 'pending'). */
  async function reopenTicket(id) {
    updatedTickets.value[id] = true;
    await updateTicketStatus(id, "pending", "🔄 Ticket reaberto");
    sonnerAlert("🔄 Ticket reaberto");
  }

  /** Finaliza um ticket (status → 'closed'). */
  async function closeTicket(id) {
    if (!confirm("Deseja finalizar este ticket?")) return;
    updatedTickets.value[id] = true;
    await updateTicketStatus(id, "closed", "✅ Ticket finalizado");
    sonnerAlert("✅ Ticket finalizado");
    socket.value.emit("chat:closedTicket", "Seu ticket foi fechado. Obrigado!");
  }

  /** Atualiza o termo de busca. */
  const updateSearchTerm = (event) => {
    searchTerm.value = event.target.value;
  };

  // --- Mensagens e arquivos ---

  /** Aciona o input oculto de seleção de arquivo. */
  const triggerFileInput = () => {
    fileInput.value?.click();
  };

  /**
   * Processa os arquivos selecionados (valida tamanho, gera preview).
   * @param {Event} event
   */
  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    for (const file of files) {
      if (file.size > 25 * 1024 * 1024) {
        alert(`O arquivo "${file.name}" excede o limite de 25 MB.`);
        continue;
      }
      selectedFiles.value.push({
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        preview: file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : null,
        caption: "",
      });
    }
    event.target.value = "";
  };

  /**
   * Remove um arquivo da fila de envio.
   * @param {number} index
   */
  const removeFile = (index) => {
    const fileObj = selectedFiles.value[index];
    if (fileObj.preview) URL.revokeObjectURL(fileObj.preview);
    selectedFiles.value.splice(index, 1);
  };

  /** Envia mensagem de texto para o ticket atual. */
  const sendMessage = async () => {
    if (!currentTicket.value || !newMessageText.value.trim()) return;

    const text = assinarMensagem.value
      ? `*${currentUser.value.name}*:\n ${newMessageText.value.trim()}`
      : newMessageText.value.trim();
    newMessageText.value = "";

    const tempMessage = {
      id: "temp_" + Date.now() + "_" + Math.random(),
      body: text,
      fromMe: true,
      createdAt: new Date().toISOString(),
      ack: 0,
      mediaType: "text",
      isDeleted: false,
      isForwarded: false,
      isTemp: true,
    };
    tempMessages.value.push(tempMessage);
    await nextTick();
    scrollToBottom();

    const formData = new FormData();
    formData.append("body", text);
    formData.append("fromMe", "true");
    await fetch(`${URL_BASE}/api/v1/messages/${currentTicket.value.id}`, {
      method: "POST",
      body: formData,
      headers: { Authorization: `Bearer ${token.value}` },
    });
  };

  /** Envia os arquivos selecionados para o ticket atual. */
  const sendFiles = async () => {
    if (!currentTicket.value || selectedFiles.value.length === 0) return;

    const formData = new FormData();
    selectedFiles.value.forEach(async (item, idx) => {
      if (item.caption) {
        formData.append(
          "body",
          assinarMensagem.value
            ? `*${currentUser.value.name}*:\n ${item.caption.trim()}`
            : item.caption.trim(),
        );
      }
      formData.append("files", item.file);
      const temp = {
        id: "temp_" + Date.now() + "_" + Math.random(),
        body: item.caption || item.name,
        fromMe: true,
        createdAt: new Date().toISOString(),
        ack: 0,
        mediaType: item.type.startsWith("image/")
          ? "image"
          : item.type.startsWith("video/")
            ? "video"
            : item.type.startsWith("audio/")
              ? "audio"
              : "document",
        mediaUrl: item.preview,
        isDeleted: false,
      };
      tempMessages.value.push(temp);
      selectedFiles.value = [];
      newMessageText.value = "";
      await nextTick();
      scrollToBottom();
    });

    try {
      const res = await fetch(
        `${URL_BASE}/api/v1/messages/${currentTicket.value.id}`,
        {
          method: "POST",
          body: formData,
          headers: { Authorization: `Bearer ${token.value}` },
        },
      );
      if (res.ok) {
        selectedFiles.value.forEach(
          (f) => f.preview && URL.revokeObjectURL(f.preview),
        );
        await loadMessages(currentTicket.value.id);
      } else {
        alert("Erro ao enviar arquivos. Tente novamente.");
      }
    } catch (err) {
      console.log("Erro de rede ao enviar arquivos:", err);
      alert("Erro de rede. Verifique sua conexão e tente novamente.");
    }
  };

  // --- Helpers de mídia ---

  const getMediaUrl = (mediaUrl) => `${URL_BASE}/public/${mediaUrl}`;
  const openInNewTab = (url) => window.open(url, "_blank");
  const getFileName = (body) => {
    if (!body) return "Documento";
    return body.length > 40 ? `${body.substring(0, 40)}...` : body;
  };
  const getFileExtension = (body) => {
    if (!body) return "";
    return body.split(".").pop()?.toUpperCase() || "";
  };
  const isDocumentWithoutCaption = (mediaType) =>
    ["txt", "document"].includes(mediaType);
  const getFileIcon = (type) => {
    if (type.includes("pdf")) return "📄";
    if (type.includes("video")) return "🎥";
    if (type.includes("audio")) return "🎵";
    return "📎";
  };

  return {
    // Estado
    allTickets,
    currentTicket,
    searchTerm,
    showOnlyClosed,
    loadingTickets,
    buscarPalavras,
    updatedTickets,
    currentMessages,
    newMessageText,
    loadingMessages,
    tempMessages,
    assinarMensagem,
    fileInput,
    selectedFiles,
    // Computed
    filteredTickets,
    allMessages,
    // Funções
    loadQuotedMsg,
    scrollToBottom,
    updateSingleTicket,
    loadTickets,
    loadMessages,
    selectTicket,
    attendTicket,
    reopenTicket,
    closeTicket,
    updateSearchTerm,
    triggerFileInput,
    handleFileSelect,
    removeFile,
    sendMessage,
    sendFiles,
    getMediaUrl,
    openInNewTab,
    getFileName,
    getFileExtension,
    isDocumentWithoutCaption,
    getFileIcon,
  };
}
