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
  const loadingMoreMessages = ref(false);
  const hasMoreMessages = ref(false);
  const messageOffset = ref(0);
  const tempMessages = ref([]);

  const MESSAGE_PAGE_SIZE = 40;
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
    if (messageRespondida) {
      return messageRespondida;
    }
    return null;
  };
  /**
   * Carrega as mensagens de um ticket específico.
   * @param {number|string} ticketId
   */
  const loadMessages = async (ticketId, { append = false } = {}) => {
    if (append) {
      if (loadingMoreMessages.value || !hasMoreMessages.value) return;
      loadingMoreMessages.value = true;
    } else {
      tempMessages.value = [];
      messageOffset.value = 0;
      hasMoreMessages.value = false;
    }

    const ticket = allTickets.value.find((t) => t.id === ticketId);
    const requestedSkip = append ? messageOffset.value : 0;

    try {
      // O endpoint devolve somente uma página. A mensagem persistida contém
      // mediaUrl e mediaType definitivos, nunca o preview local `blob:`.
      const params = new URLSearchParams({
        limit: String(MESSAGE_PAGE_SIZE),
        skip: String(requestedSkip),
      });
      const response = await fetch(
        `${URL_BASE}/api/v1/messages/${ticketId}?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token.value}` } },
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const messages = Array.isArray(data.messages)
        ? data.messages
        : Array.isArray(data)
          ? data
          : [];

      const merged = new Map();
      for (const message of append
        ? [...currentMessages.value, ...messages]
        : messages) {
        const key = message.id || message.messageId;
        if (key) merged.set(String(key), message);
      }

      const orderedMessages = [...merged.values()].sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      );
      currentMessages.value = orderedMessages;

      // O cache fica em ordem decrescente, compatível com o listener
      // `new-message`; somente a renderização usa ordem crescente.
      if (ticket) {
        const cached = new Map();
        for (const message of append
          ? [...(ticket.messages || []), ...messages]
          : messages) {
          const key = message.id || message.messageId;
          if (key) cached.set(String(key), message);
        }
        ticket.messages = [...cached.values()].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        );
      }

      messageOffset.value = requestedSkip + messages.length;
      hasMoreMessages.value = Boolean(data.hasMore);
    } catch (error) {
      // Em caso de falha inicial, preserva o fallback já carregado no ticket.
      // Em uma página adicional, mantém as mensagens atuais sem descartá-las.
      console.error("Erro ao carregar mensagens do ticket:", error);
      if (!append) {
        currentMessages.value = ticket?.messages
          ? [...ticket.messages].sort(
              (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
            )
          : [];
      }
    } finally {
      if (append) loadingMoreMessages.value = false;
    }

    await nextTick();
    if (!append) scrollToBottom(ticketId);
  };

  /** Carrega a página anterior quando o operador chega ao topo do histórico. */
  const loadMoreMessages = async () => {
    if (!currentTicket.value) return;

    const area = document.querySelector(".messages-area");
    const previousHeight = area?.scrollHeight || 0;
    const previousTop = area?.scrollTop || 0;

    await loadMessages(currentTicket.value.id, { append: true });
    await nextTick();

    // Mantém a mesma mensagem visível depois de inserir itens acima.
    if (area && area.scrollHeight > previousHeight) {
      area.scrollTop = area.scrollHeight - previousHeight + previousTop;
    }
  };

  const handleMessagesScroll = (event) => {
    if (event.currentTarget.scrollTop <= 80) {
      void loadMoreMessages();
    }
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
    await loadMessages(ticketId);
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

    // Copia a fila antes de qualquer atualização reativa. O código anterior
    // limpava selectedFiles dentro de um forEach assíncrono e perdia a
    // referência necessária para limpar previews e tratar a resposta.
    const filesToSend = [...selectedFiles.value];
    const formData = new FormData();
    const temporaryMessages = filesToSend.map((item) => ({
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
    }));

    filesToSend.forEach((item) => {
      if (item.caption?.trim()) {
        formData.append(
          "body",
          assinarMensagem.value
            ? `*${currentUser.value.name}*:\n ${item.caption.trim()}`
            : item.caption.trim(),
        );
      }
      formData.append("files", item.file, item.name);
    });

    tempMessages.value.push(...temporaryMessages);
    selectedFiles.value = [];
    newMessageText.value = "";
    await nextTick();
    scrollToBottom();

    try {
      const res = await fetch(
        `${URL_BASE}/api/v1/messages/${currentTicket.value.id}`,
        {
          method: "POST",
          body: formData,
          headers: { Authorization: `Bearer ${token.value}` },
        },
      );

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      filesToSend.forEach(
        (item) => item.preview && URL.revokeObjectURL(item.preview),
      );
      tempMessages.value = tempMessages.value.filter(
        (message) => !temporaryMessages.includes(message),
      );

      // Reconsulta a mensagem persistida. Assim o painel troca o blob: local
      // pela URL /public/<uuid> criada pelo backend.
      await loadMessages(currentTicket.value.id);
    } catch (error) {
      console.error("Erro ao enviar arquivos:", error);
      // Restaura a fila para permitir nova tentativa sem perder os arquivos.
      selectedFiles.value = filesToSend;
      tempMessages.value = tempMessages.value.filter(
        (message) => !temporaryMessages.includes(message),
      );
      alert("Erro ao enviar arquivos. Tente novamente.");
    }
  };

  // --- Helpers de mídia ---

  const getMediaUrl = (mediaUrl) => {
    if (!mediaUrl) return "";

    const value = String(mediaUrl).trim();
    if (/^https?:\/\//i.test(value)) return value;

    const baseUrl = String(URL_BASE || "").replace(/\/+$/, "");
    if (!baseUrl) return "";

    const publicPath = value.startsWith("/public/")
      ? value
      : `/public/${encodeURIComponent(value.replace(/^\/+/, ""))}`;

    return `${baseUrl}${publicPath}`;
  };
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
    loadingMoreMessages,
    hasMoreMessages,
    messageOffset,
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
    loadMoreMessages,
    handleMessagesScroll,
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
