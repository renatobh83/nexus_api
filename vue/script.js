/**
 * @file app.js
 * @description Aplicação Vue 3 para gerenciamento de atendimento via tickets e canais (WhatsApp/Telegram).
 *
 * Estrutura:
 *  1. Configuração e constantes
 *  2. Estado reativo (refs)
 *  3. Computed properties
 *  4. Funções de autenticação e sessão
 *  5. Socket.IO – eventos em tempo real
 *  6. Funções de ticket
 *  7. Funções de mensagem e arquivos
 *  8. Funções de broadcast
 *  9. Funções de canal
 * 10. Funções de usuario
 * 11. Funções de qrCode
 * 12. Utilitários de UI e formatação
 * 13. Inicialização (onMounted)
 */
// Estados possíveis qrCode
const STATUS = {
  CONNECTING: "connecting",
  LOADING: "loading",
  ERROR: "error",
  EXPIRED: "expired",
  SUCCESS: "success",
};
const { createApp, ref, computed, onMounted, nextTick, watch, onUnmounted } =
  Vue;

createApp({
  setup() {
    const notifications = useNotifications({
      playNotificationSound: () =>
        new Audio(
          "https://notificationsounds.com/storage/sounds/file-sounds-1147-that-was-quick.mp3",
        ).play(),
      openChat: (ticket) => {
        selectTicket(ticket);
      },
    });

    // =========================================================================
    // 1. CONFIGURAÇÃO E CONSTANTES
    // =========================================================================

    /** URL base da API e servidor Socket.IO */
    const URL_BASE = "https://fast.panelapps.site/";
    // const URL_BASE = "http://localhost:3000";

    /** Referência ao socket Socket.IO (inicializado em initSocket) */
    let socket = null;

    // =========================================================================
    // 2. ESTADO REATIVO
    // =========================================================================

    // --- Interface geral ---
    const activeTab = ref("chats");
    const sidebarOpen = ref(false);
    const configSubtab = ref("users");
    const userMenuOpen = ref(false);
    const socketConnected = ref(false);
    const showAlerta = ref(false);
    const assinarMensagem = ref(false);

    // Alerta
    const alertaMessage = ref("");
    const isSuccess = ref(true);

    // --- Autenticação ---
    const isAuthenticated = ref(false);
    const currentUser = ref(null);

    // --- Tickets ---
    const allTickets = ref([]);
    const currentTicket = ref(null);
    const searchTerm = ref("");
    const showOnlyClosed = ref(false);
    const loadingTickets = ref(false);

    /**
     * Mapa de tickets em processo de atualização de status.
     * Chave: ticketId, Valor: boolean (true = aguardando resposta da API).
     */
    const updatedTickets = ref({});

    // --- Mensagens ---
    const currentMessages = ref([]);
    const newMessageText = ref("");
    const loadingMessages = ref(false);
    const tempMessages = ref([]);

    // --- Arquivos (chat normal) ---
    const fileInput = ref(null);
    const selectedFiles = ref([]);

    // --- Usuários ---
    const users = ref([]);
    const loadingUsers = ref(false);

    const userModalVisible = ref(false);
    const editingUser = ref({
      id: null,
      name: "",
      email: "",
      role: "atendente",
      status: "ativo",
    });

    // --- Canais ---
    const channels = ref([]);
    const loadingChannels = ref(false);
    const currentChannelId = ref(null);
    const channelModalVisible = ref(false);
    const selectedChannelType = ref("");
    const newChannelName = ref("");
    const newChannelToken = ref("");
    const newChannelNumber = ref("");
    const businessAccountId = ref("");
    const accessToken = ref("");
    const phoneNumberId = ref("");
    const editingChannel = ref({
      selectedChannelType: "",
    });

    // --- Broadcast ---
    const broadcastModalVisible = ref(false);
    const broadcastFileInput = ref(null);
    const broadcastChannelId = ref("");
    const broadcastNumber = ref("");
    const broadcastMessage = ref("");
    const broadcastFileName = ref("");
    const selectedBroadcastFiles = ref([]);
    const sendingBroadcast = ref(false);

    // --- QrCode ---
    const qrCodeContainerRef = ref(null);
    const qrCodeModalVisible = ref(false);
    const pairingContainer = ref(false);
    const qrcodeImage = ref(false);
    const isPairingCode = ref(false);
    const qrString = ref("");
    const isLoading = ref(false);
    const currentStatus = ref(STATUS.CONNECTING);
    const showPairingCode = ref("");
    // =========================================================================
    // 3. COMPUTED PROPERTIES
    // =========================================================================

    /**
     * Tickets filtrados por nome do contato, status (aberto/fechado) e
     * visibilidade do usuário logado (atendentes só veem seus próprios tickets
     * ou tickets pendentes ainda não atribuídos).
     * Ordenados pelo timestamp da última mensagem (mais recente primeiro).
     */
    const filteredTickets = computed(() => {
      return allTickets.value
        .filter((ticket) => {
          const isOwnOrPending =
            ticket.status === "pending" ||
            ticket.userId === currentUser.value?.id;

          const matchesSearch = (ticket.owner || ticket.name || "")
            .toLowerCase()
            .includes(searchTerm.value.toLowerCase());

          const matchesStatus = showOnlyClosed.value
            ? ticket.status === "closed"
            : ticket.status !== "closed";

          return isOwnOrPending && matchesSearch && matchesStatus;
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

    /**
     * Lista de usuários visível ao operador logado.
     * Administradores veem todos; atendentes veem apenas o próprio perfil.
     */
    const filteredUsers = computed(() => {
      if (currentUser.value?.role === "administrador") return users.value;
      return users.value.filter((u) => u.id === currentUser.value?.id);
    });
    /** Atalho para verificar se o usuário logado é administrador. */
    const isAdmin = computed(() => currentUser.value?.role === "administrador");

    /**
     * status qrcode na inicializacao
     */
    const statusClass = computed(() => {
      const classes = {
        [STATUS.CONNECTING]: "connecting",
        [STATUS.LOADING]: "loading",
        [STATUS.ERROR]: "error",
        [STATUS.EXPIRED]: "expired",
        [STATUS.SUCCESS]: "success",
      };
      return classes[currentStatus.value] || "connecting";
    });
    // Computed para a mensagem baseada no status
    const statusMessage = computed(() => {
      const messages = {
        [STATUS.CONNECTING]: "🔄 Aguardando QR Code...",
        [STATUS.LOADING]: "⏳ Gerando QR Code...",
        [STATUS.ERROR]: "❌ Erro ao gerar QR Code. Tente novamente!",
        [STATUS.EXPIRED]:
          "⏰ QR Code expirado. Clique fechar e conecte novamente.",
        [STATUS.SUCCESS]: "✅ QR Code gerado com sucesso!",
      };
      return messages[currentStatus.value] || "🔄 Aguardando QR Code...";
    });

    // =========================================================================
    // 4. AUTENTICAÇÃO E SESSÃO
    // =========================================================================
    /** Abre/fecha o menu do usuário. */
    const toggleUserMenu = () => {
      userMenuOpen.value = !userMenuOpen.value;
    };

    /** Fecha o menu do usuário (usada em click-outside). */
    const closeUserMenu = () => {
      userMenuOpen.value = false;
    };

    /**
     * Verifica se existe um token JWT válido no localStorage.
     * Em caso de falha redireciona para a página de login.
     * @returns {boolean} true se autenticado com sucesso.
     */
    const checkAuthentication = () => {
      const token = localStorage.getItem("auth_token");
      const userData = localStorage.getItem("user_data");

      if (!token || !userData) {
        redirectToLogin();
        return false;
      }

      try {
        // Decodifica o payload do JWT (sem verificar assinatura – apenas client-side)
        const payload = JSON.parse(atob(token.split(".")[1]));

        if (payload.exp < Date.now() / 1000) {
          clearSession();
          redirectToLogin();
          return false;
        }

        const parsedUser = JSON.parse(userData);
        parsedUser.role = payload.profile;
        currentUser.value = parsedUser;
        isAuthenticated.value = true;
        return true;
      } catch {
        clearSession();
        redirectToLogin();
        return false;
      }
    };

    /** Remove os dados de sessão do localStorage. */
    const clearSession = () => {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user_data");
    };

    /** Desloga o usuário e redireciona para login. */
    const handleLogout = () => {
      clearSession();
      redirectToLogin();
    };

    /** Redireciona para a página de login. */
    const redirectToLogin = () => {
      window.location.href = "login.html";
    };

    // =========================================================================
    // 5. SOCKET.IO – EVENTOS EM TEMPO REAL
    // =========================================================================
    /**
     * Inicializa a conexão Socket.IO e registra os listeners de eventos.
     * Garante que apenas uma instância de socket seja criada.
     */
    function initSocket() {
      if (socket?.connected) {
        console.log("Socket já conectado, ignorando nova inicialização.");
        return;
      }

      socket = io(URL_BASE, {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      // Conexão estabelecida
      socket.on("connect", () => {
        socketConnected.value = true;
        console.log("✅ Socket conectado");
      });

      // Conexão encerrada
      socket.on("disconnect", () => {
        socketConnected.value = false;
        console.warn("🔴 Socket desconectado");
      });

      // Falha na conexão
      socket.on("connect_error", (error) => {
        console.error("Erro de conexão Socket.IO:", error);
      });

      // Nova mensagem recebida
      socket.on("new-message", async (message) => {
        console.log("📨 Nova mensagem recebida:", message);

        const ticket = allTickets.value.find((t) => t.id === message.ticketid);
        const ticketName =
          ticket?.owner || ticket?.name || `Ticket ${message.ticketid}`;

        // Notifica apenas mensagens recebidas (não enviadas pelo atendente)
        const isIncoming =
          !message.fromMe &&
          ticket.status !== "pending" &&
          currentUser.value.id === ticket.userId;

        if (isIncoming) {
          const dataNoti = {
            body: message.body?.substring(0, 60) || "Nova mensagem",
            ticketId: ticket.id,
            contato: `💬 Nova mensagem de ${ticketName}`,
          };
          notifications.show(dataNoti);
          // showNotification(
          //   `💬 Nova mensagem de ${ticketName}`,
          //   message.body?.substring(0, 60) || "Nova mensagem",
          //   `msg-${message.id}`,
          // );
          sonnerAlert(`Nova mensagem de ${ticketName}`);
          scrollToBottom(ticket.id);
        }

        // Atualiza o ticket localmente para evitar reload completo
        if (ticket) {
          if (!ticket.messages) ticket.messages = [];
          ticket.messages.unshift(message); // mais recente no topo
          ticket.lastMessage = message.body;
          ticket.lastMessageAt = message.createdAt;
        }

        // Recarrega mensagens se o ticket ativo for o que recebeu a mensagem
        if (currentTicket.value?.id === message.ticketid) {
          await loadMessages(currentTicket.value.id);
        }
      });

      // Ticket atualizado (status, atribuição, etc.)
      socket.on("ticket-updated", async (data) => {
        console.log("🔄 Ticket atualizado:", data);
        // Notifica quando um ticket passa para pendente
        if (data.status === "pending" && data.previousStatus !== "pending") {
          const name = data.owner || data.name || `Ticket ${data.id}`;
          const dataNoti = {
            body: data.lastMessage,
            ticketId: data.id,
            contato: `🆕 Novo ticket pendente ${name}`,
          };
          notifications.show(dataNoti);
          // TODO ver notificao aqui
          // showNotification(
          //   "🆕 Novo ticket pendente",
          //   `${name} aguarda atendimento`,
          //   `ticket-${data.id}-pending`,
          // );
        }
        updateSingleTicket(data);
      });

      // Atualização de status de canal (QR Code, pareamento, conexão)
      socket.on("channel-update", (data) => {
        console.log("📡 Atualização de canal:", data);

        const isCurrentChannel =
          currentChannelId.value &&
          currentChannelId.value === (data.channelId || data.id);

        if (!isCurrentChannel) return;

        if (data.status === "qrcode" && data.qrcode) {
          generateQRCode(data.qrcode);
        }
        // showQRCode(data.qrcode);
        if (data.pairingCode) {
          isPairingCode.value = true;
          showPairingCode.value = data.pairingCode;
        }
        if (data.status === "CONNECTED") {
          sonnerAlert(`Canal conectado `);
          updateQRCodeStatus(STATUS.SUCCESS, true);
          setTimeout(() => {
            qrCodeModalVisible.value = false;
            updateSingleChannel(data);
          }, 2000);
        }
      });
    }

    // =========================================================================
    // 6. FUNÇÕES DE TICKET
    // =========================================================================

    /**
     * Inicia o atendimento de um ticket (status → 'open').
     * @param {number|string} id - ID do ticket.
     */
    async function attendTicket(id) {
      updatedTickets.value[id] = true;
      await updateTicketStatus(id, "open", "🎧 Ticket em atendimento");
      sonnerAlert("🎧 Ticket em atendimento");
    }

    /**
     * Reabre um ticket finalizado (status → 'pending').
     * @param {number|string} id - ID do ticket.
     */
    async function reopenTicket(id) {
      updatedTickets.value[id] = true;
      await updateTicketStatus(id, "pending", "🔄 Ticket reaberto");
      sonnerAlert("🔄 Ticket reaberto");
    }

    /**
     * Finaliza um ticket após confirmação do usuário (status → 'closed').
     * @param {number|string} id - ID do ticket.
     */
    async function closeTicket(id) {
      if (!confirm("Deseja finalizar este ticket?")) return;
      updatedTickets.value[id] = true;
      await updateTicketStatus(id, "closed", "✅ Ticket finalizado");
      sonnerAlert("✅ Ticket finalizado");
    }
    /**
     * Seleciona um ticket.
     * @param {number|string} id - ID do ticket.
     */
    const selectTicket = async (ticketId) => {
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
     * Atualiza o status de um ticket via API e sincroniza o estado local.
     * @param {number|string} id     - ID do ticket.
     * @param {string}        status - Novo status ('open' | 'closed' | 'pending').
     * @param {string}        msg    - Mensagem de feedback para a notificação.
     */
    async function updateTicketStatus(id, status, msg) {
      try {
        const payload = { ...currentUser.value, status };

        const response = await fetch(`${URL_BASE}/api/v1/tickets/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const updatedData = await response.json();
          updateSingleTicket(updatedData);
          // sonnerAlert("Ticket atualizado");
          // showNotification("Atualização de Ticket", msg);
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
    /**
     * Substitui (ou insere) um ticket na lista local pelo dado recebido da API/Socket.
     * Evita recarregar toda a lista de tickets.
     * @param {Object} updatedTicket - Objeto do ticket com dados atualizados.
     */
    function updateSingleTicket(updatedTicket) {
      const index = allTickets.value.findIndex(
        (t) => t.id === updatedTicket.id,
      );
      if (index !== -1) {
        allTickets.value[index] = {
          ...allTickets.value[index],
          ...updatedTicket,
        };
      } else {
        allTickets.value.unshift(updatedTicket);
      }
      if (chartHandler2) {
        chartHandler2.render();
      }
    }

    /**
     * Carrega todos os tickets da API.
     * Ordena por lastMessageAt decrescente.
     */
    const loadTickets = async () => {
      loadingTickets.value = true;
      try {
        const res = await fetch(`${URL_BASE}/api/v1/tickets`);
        const data = await res.json();
        allTickets.value = (data.tickets || data || []).sort(
          (a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0),
        );
      } catch (e) {
        console.error("Erro ao carregar tickets:", e);
      } finally {
        loadingTickets.value = false;
      }
    };

    /**
     * Carrega as mensagens de um ticket específico.
     * @param {number|string} ticketId - ID do ticket.
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

    // Atualiza o termo de busca a partir de um evento de input
    const updateSearchTerm = (event) => {
      searchTerm.value = event.target.value;
    };

    // =========================================================================
    // 7. MENSAGENS E ARQUIVOS (CHAT)
    // =========================================================================

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

      // Scroll imediato
      area.scrollTop = area.scrollHeight;

      // Aguarda todas as imagens que ainda não carregaram
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

      // ResizeObserver como fallback (sem timeout fixo — desconecta quando a área parar de crescer)
      let resizeTimeout;
      const resizeObserver = new ResizeObserver(() => {
        area.scrollTop = area.scrollHeight;

        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => resizeObserver.disconnect(), 1000);
      });

      resizeObserver.observe(area);
    };

    // --- Seleção e envio de arquivos no chat ---

    /** Aciona o input oculto de seleção de arquivo. */
    const triggerFileInput = () => {
      fileInput.value?.click();
    };
    /**
     * Processa os arquivos selecionados pelo usuário no chat.
     * Valida tamanho (max 25 MB) e gera preview para imagens.
     * @param {Event} event - Evento change do input[type=file].
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

      // Limpa o input para permitir re-seleção do mesmo arquivo
      event.target.value = "";
    };

    /**
     * Remove um arquivo da fila de envio e libera a URL de preview.
     * @param {number} index - Índice do arquivo em selectedFiles.
     */
    const removeFile = (index) => {
      const fileObj = selectedFiles.value[index];
      if (fileObj.preview) URL.revokeObjectURL(fileObj.preview);
      selectedFiles.value.splice(index, 1);
    };
    /**
     * Envia mensagem para o ticket atual (currentTicket).
     */
    const sendMessage = async () => {
      if (!currentTicket.value || !newMessageText.value.trim()) return;

      const text = assinarMensagem.value
        ? `*${currentUser.value.name}*:\n ${newMessageText.value.trim()}`
        : newMessageText.value.trim();
      newMessageText.value = "";

      const tempId = "temp_" + Date.now() + "_" + Math.random();
      const tempMessage = {
        id: tempId,
        body: text,
        fromMe: true,
        createdAt: new Date().toISOString(),
        ack: 0,
        mediaType: "text",
        isDeleted: false,
        isForwarded: false,
        isTemp: true, // Marcar como temporária
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
      });
    };
    /**
     * Envia os arquivos selecionados para o ticket atual via FormData.
     * Inclui legenda individual por arquivo e mensagem de texto opcional.
     */
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
          },
        );
        if (res.ok) {
          // Libera URLs de preview e limpa fila
          selectedFiles.value.forEach(
            (f) => f.preview && URL.revokeObjectURL(f.preview),
          );

          await loadMessages(currentTicket.value.id);
        } else {
          alert("Erro ao enviar arquivos. Tente novamente.");
        }
      } catch (err) {
        console.error("Erro de rede ao enviar arquivos:", err);
        alert("Erro de rede. Verifique sua conexão e tente novamente.");
      }
    };
    // --- Helpers para exibição de mídia nas mensagens ---

    /**
     * Retorna a URL pública de uma mídia armazenada no servidor.
     * @param {string} mediaUrl - Caminho relativo da mídia.
     * @returns {string} URL absoluta.
     */
    const getMediaUrl = (mediaUrl) => `${URL_BASE}/public/${mediaUrl}`;

    /** Abre uma URL em nova aba. */
    const openInNewTab = (url) => window.open(url, "_blank");

    /**
     * Retorna o nome do arquivo truncado para exibição.
     * @param {string} body - Nome ou caminho do arquivo.
     * @returns {string}
     */
    const getFileName = (body) => {
      if (!body) return "Documento";
      return body.length > 40 ? `${body.substring(0, 40)}...` : body;
    };

    /**
     * Retorna a extensão do arquivo em maiúsculas.
     * @param {string} body - Nome ou caminho do arquivo.
     * @returns {string}
     */
    const getFileExtension = (body) => {
      if (!body) return "";
      return body.split(".").pop()?.toUpperCase() || "";
    };

    /**
     * Verifica se o tipo de mídia é um documento simples (sem legenda separada).
     * @param {string} mediaType - Tipo da mídia.
     * @returns {boolean}
     */
    const isDocumentWithoutCaption = (mediaType) =>
      ["txt", "document"].includes(mediaType);

    /**
     * Retorna um emoji de ícone conforme o tipo MIME do arquivo.
     * @param {string} type - Tipo MIME.
     * @returns {string}
     */
    const getFileIcon = (type) => {
      if (type.includes("pdf")) return "📄";
      if (type.includes("video")) return "🎥";
      if (type.includes("audio")) return "🎵";
      return "📎";
    };
    // =========================================================================
    // 8. BROADCAST
    // =========================================================================

    /** Abre o modal de broadcast e limpa os campos do formulário. */
    const openBroadcastModal = () => {
      broadcastChannelId.value = "";
      broadcastNumber.value = "";
      broadcastMessage.value = "";
      broadcastFileName.value = "";
      selectedBroadcastFiles.value = [];
      broadcastModalVisible.value = true;
    };
    const closeBroadcastModal = () => {
      broadcastChannelId.value = "";
      broadcastNumber.value = "";
      broadcastMessage.value = "";
      broadcastFileName.value = "";
      selectedBroadcastFiles.value = [];
      broadcastModalVisible.value = false;
    };

    /** Aciona o input oculto de arquivo para broadcast. */
    const triggerBroadcastFile = () => {
      broadcastFileInput.value?.click();
    };

    /**
     * Processa os arquivos selecionados para o broadcast.
     * Segue as mesmas regras de validação do chat normal.
     * @param {Event} event - Evento change do input[type=file].
     */
    const handleBroadcastFileSelect = (event) => {
      const files = Array.from(event.target.files);

      for (const file of files) {
        if (file.size > 25 * 1024 * 1024) {
          alert(`O arquivo "${file.name}" excede o limite de 25 MB.`);
          continue;
        }

        broadcastFileName.value = file.name;
        selectedBroadcastFiles.value.push({
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
     * Remove um arquivo da fila de broadcast.
     * @param {number} index - Índice do arquivo.
     */
    const removeBroadcastFile = (index) => {
      // Libera preview se existir
      const fileObj = selectedBroadcastFiles.value[index];
      if (fileObj?.preview) URL.revokeObjectURL(fileObj.preview);

      selectedBroadcastFiles.value.splice(index, 1);
      broadcastFileName.value = "";
    };

    /**
     * Envia a mensagem de broadcast para o(s) número(s) informado(s).
     * TODO: implementar chamada à API de broadcast.
     */
    const sendBroadcastMessage = async () => {
      if (!broadcastChannelId.value || !broadcastNumber.value) {
        alert("Preencha o canal e o número de destino.");
        return;
      }

      const formData = new FormData();
      formData.append("to", broadcastNumber.value);
      formData.append("body", broadcastMessage.value || "");

      if (selectedBroadcastFiles.value[0]) {
        selectedBroadcastFiles.value.forEach((item, idx) => {
          formData.append("files", item.file);
          if (broadcastMessage.value)
            formData.append(`caption_${idx}`, broadcastMessage.value);
          // if (item.caption) formData.append(`caption_${idx}`, item.caption);
        });
      }
      sendingBroadcast.value = true;
      try {
        await fetch(
          `${URL_BASE}/api/v1/channel/${broadcastChannelId.value}/send`,
          {
            method: "POST",
            body: formData,
          },
        );
      } finally {
        sendingBroadcast.value = false;
        closeBroadcastModal();
      }
    };

    // =========================================================================
    // 9. CANAIS
    // =========================================================================
    /**
     * Abri modal novo canal
     */
    const openAddChannelModal = () => {
      editingChannel.value = {};
      selectedChannelType.value = "";
      newChannelName.value = "";
      newChannelToken.value = "";
      newChannelNumber.value = "";
      businessAccountId.value = "";
      accessToken.value = "";
      phoneNumberId.value = "";
      channelModalVisible.value = true;
    };
    /**
     * Substitui (ou insere) um canal na lista local pelo dado recebido da API/Socket.
     * Evita recarregar toda a lista de canal.
     * @param {Object} updatedChannel - Objeto do ticket com dados atualizados.
     */
    function updateSingleChannel(updatedChannel) {
      const index = channels.value.findIndex((t) => t.id === updatedChannel.id);
      if (index !== -1) {
        channels.value[index] = {
          ...channels.value[index],
          ...updatedChannel,
        };
      } else {
        channels.value.unshift(updatedChannel);
      }
    }
    /**
     * Cria um novo canal de atendimento
     */
    const createChannel = async () => {
      if (!selectedChannelType.value || !newChannelName.value)
        return alert("Preencha os campos");
      const data = {
        name: newChannelName.value,
        type: selectedChannelType.value,
      };

      if (selectedChannelType.value === "telegram")
        data.tokenTelegram = newChannelToken.value;
      if (selectedChannelType.value === "whatsapp") {
        if (newChannelNumber.value) {
          data.pairingCodeEnabled = true;
        } else {
          data.pairingCodeEnabled = false;
        }

        data.wppUser = newChannelNumber.value;
      }
      if (selectedChannelType.value === "wpp-business") {
        data.businessAccountId = businessAccountId.value;
        data.accessToken = accessToken.value;
        data.phoneNumberId = phoneNumberId.value;
      }

      const isEditing = editingChannel.value && editingChannel.value.id;
      const url = isEditing
        ? `${URL_BASE}/api/v1/channel/${editingChannel.value.id}`
        : `${URL_BASE}/api/v1/channel`;
      const method = isEditing ? "PUT" : "POST";
      try {
        const response = await fetch(url, {
          method: method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) throw new Error("Erro ao salvar canal");
        const channel = await response.json();
        sonnerAlert(
          isEditing
            ? "Canal atualizado com sucesso!"
            : "Canal criado com sucesso!",
        );
        channelModalVisible.value = false;

        // Limpa o editingChannel após salvar
        editingChannel.value = {};
        updateSingleChannel(channel);
        // await loadChannels();
      } catch (error) {
        console.error("Erro:", error);
        sonnerAlert("Erro ao salvar canal", false);
      }
      await fetch(`${URL_BASE}/api/v1/channel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      channelModalVisible.value = false;
      await loadChannels();
    };
    // Função para fechar o modal e limpar
    const closeChannelModal = () => {
      channelModalVisible.value = false;
      editingChannel.value = {};
      selectedChannelType.value = "";
      newChannelName.value = "";
      newChannelToken.value = "";
      newChannelNumber.value = "";
      businessAccountId.value = "";
      accessToken.value = "";
      phoneNumberId.value = "";
    };
    // Função para carregar o canal para edição
    const loadChannelForEdit = (channel) => {
      if (!channel || !channel.id) return;

      // 1. Primeiro seleciona o tipo do canal
      selectedChannelType.value = channel.type;

      // 2. Depois carrega os dados específicos de cada tipo
      newChannelName.value = channel.name || "";

      // Limpa campos anteriores
      newChannelToken.value = "";
      newChannelNumber.value = "";
      businessAccountId.value = "";
      accessToken.value = "";
      phoneNumberId.value = "";

      // Preenche campos baseado no tipo
      if (channel.type === "telegram") {
        newChannelToken.value = channel.tokenTelegram || channel.token || "";
      }

      if (channel.type === "whatsapp") {
        newChannelNumber.value = channel.wppUser || channel.number || "";
      }

      if (channel.type === "wpp-business") {
        businessAccountId.value = channel.businessAccountId || "";
        accessToken.value = channel.accessToken || "";
        phoneNumberId.value = channel.phoneNumberId || "";
      }
    };
    /**
     * Faz a selecao de qual canal deve ser criado (WhatsApp, Telegram, etc.).
     *  @param {string} channel - Nome do tipo de canal.
     */
    const selectChannelType = (channel) => {
      selectedChannelType.value = channel;
    };
    /**
     * Carrega a lista de canais disponíveis (WhatsApp, Telegram, etc.).
     */
    const loadChannels = async () => {
      loadingChannels.value = true;
      try {
        const res = await fetch(`${URL_BASE}/api/v1/channel`);
        channels.value = await res.json();
      } catch (e) {
        console.error("Erro ao carregar canais:", e);
      } finally {
        loadingChannels.value = false;
      }
    };
    /**
     * Editando canal
     * @param {object} channel
     */
    const editChannel = (channel) => {
      editingChannel.value = JSON.parse(JSON.stringify(channel));
      channelModalVisible.value = true;
    };
    /**
     * Faz a conexao com o canal selecionado
     * @param {string} channelId - id do canal
     */
    const connectChannel = async (channelId) => {
      currentChannelId.value = channelId;
      qrCodeModalVisible.value = true;
      try {
        await fetch(`${URL_BASE}/api/v1/channel/${channelId}/connect`, {
          method: "POST",
        });
      } catch (error) {
        console.error("Erro:", error);
        // updateQRCodeStatus("error", "Erro ao conectar");
      }
    };
    /**
     *  Recria a conexao do canal
     *  @param {string} channelId - id do canal
     */
    const refreshChannel = async (channelId) => {
      console.log(`Reconectando canal ${channelId}...`);
      await disconnectChannel(channelId);
      setTimeout(() => connectChannel(channelId), 1000);
    };
    /**
     *  Fecha a conexao de um canal
     * @param {string} channelId - id do canal
     */
    const disconnectChannel = async (channelId) => {
      if (!confirm("Desconectar este canal?")) return;
      try {
        await fetch(`${URL_BASE}/api/v1/channel/${channelId}/disconnect`, {
          method: "POST",
        });
        sonnerAlert("Canal desconectado");

        await loadChannels();
      } catch (error) {
        sonnerAlert("Erro ao desconectar", false);
      }
    };
    // =========================================================================
    // 10. USUARIOS
    // =========================================================================
    /**
     * Carrega a lista de usuarios.
     */
    const loadUsers = async () => {
      loadingUsers.value = true;
      try {
        const res = await fetch(`${URL_BASE}/api/v1/users`);
        users.value = await res.json();
      } catch (e) {
        console.error(e);
      } finally {
        loadingUsers.value = false;
      }
    };

    /**
     * Abre o modal de usuario
     */
    const openUserModal = () => {
      editingUser.value = {
        id: null,
        name: "",
        email: "",
        role: "atendente",
        status: "ativo",
      };
      userModalVisible.value = true;
    };
    /**
     * Cria ou edita um usario no servidor
     *
     */
    const saveUser = async () => {
      if (!editingUser.value.name || !editingUser.value.email)
        return alert("Preencha nome e email");

      const method = editingUser.value.id ? "PUT" : "POST";
      const url = editingUser.value.id
        ? `${URL_BASE}/api/v1/users/${editingUser.value.id}`
        : `${URL_BASE}/api/v1/users`;

      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingUser.value),
      });

      if (editingUser.value.id === currentUser.value.id) {
        currentUser.value = editingUser.value;
      }
      userModalVisible.value = false;
      await loadUsers();
    };
    /**
     * Edita os dados de um usuario
     * @param {object} user - Usuario que vai ser editado.
     *
     */
    const editUser = (user) => {
      editingUser.value = { ...user };
      userModalVisible.value = true;
    };
    /**
     * Apaga  um usuario
     * @param {string} id - Id do usuario que vai ser apagado.
     *
     */
    const deleteUser = async (id) => {
      if (confirm("Excluir?")) {
        await fetch(`${URL_BASE}/api/v1/users/${id}`, { method: "DELETE" });
        await loadUsers();
      }
    };
    // =========================================================================
    // 11. Funcoes QrCode
    // =========================================================================
    /**
     * Pega etapas do qrcode

     */

    const updateQRCodeStatus = (newStatus, hasImage = false) => {
      currentStatus.value = newStatus;
      qrcodeImage.value = hasImage;
      // Limpa o timeout anterior se existir

      if (newStatus === STATUS.SUCCESS) {
        setTimeout(async () => {
          if (currentStatus.value === STATUS.SUCCESS) {
            updateQRCodeStatus(STATUS.EXPIRED, false);
            // qrCodeModalVisible.value = false;
            // await nextTick();
            // qrCodeModalVisible.value = true;
            // await nextTick();
          }
        }, 50000);
      }
    };

    /**
     * Funcao para fechar o modal QrCode
     */
    const closeQRCodeModal = () => {
      qrCodeModalVisible.value = false;
    };

    /**
     * Funcao responsavel por gerar o Qrcode
     * @param {string} qrCode - String para gerar o qrcode
     */
    const generateQRCode = async (qrCode) => {
      if (qrCodeContainerRef.value) {
        qrCodeContainerRef.value.innerHTML = ""; // limpa anterior
      }
      qrCodeModalVisible.value = true;
      if (!qrCode) {
        isLoading.value = true;
        qrString.value = "ERRO";
        return;
      }

      await nextTick();
      // Verifica se o container existe
      if (!qrCodeContainerRef.value) {
        console.error("Container não encontrado");
        return;
      }
      updateQRCodeStatus(STATUS.LOADING, false);

      new QRCode(qrCodeContainerRef.value, {
        text: qrCode,
        width: 280,
        height: 280,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.L,
      });
      updateQRCodeStatus(STATUS.SUCCESS, true);
      isLoading.value = true;
    };
    // =========================================================================
    // 12. UTILITÁRIOS DE UI E FORMATAÇÃO
    // =========================================================================
    // Funcao para abrir o ticket a parir do click da notificacao recebida

    const handleSWMessage = (event) => {
      if (event.data && event.data.type === "NOTIFICATION_CLICK") {
        selectTicket(event.data.payload.ticket);
      }
    };
    /** Solicita permissão do navegador para exibir notificações push. */
    async function requestNotificationPermission() {
      if (!("Notification" in window)) return false;
      // notifications.requestPermission();
      if (Notification.permission === "granted") return true;

      if (Notification.permission !== "denied") {
        return (await notifications.requestPermission()) === "granted";
      }
      return false;
    }

    const sonnerAlert = (msg, success = true) => {
      showAlerta.value = true;
      isSuccess.value = success;
      alertaMessage.value = msg;
      setTimeout(() => (showAlerta.value = false), 3000);
    };

    /** Abre/fecha a sidebar em telas pequenas. */
    const toggleSidebar = () => {
      sidebarOpen.value = !sidebarOpen.value;
    };
    /**
     * Converte quebras de linha em <br> para exibição em HTML.
     * @param {string} text - Texto da mensagem.
     * @returns {string}
     */
    const formatMessage = (text) => formatarMensagem(text);
    /**
     * Retorna a inicial do nome do contato para o avatar do ticket.
     * @param {Object} ticket - Objeto do ticket.
     * @returns {string}
     */
    const getTicketAvatar = (ticket) =>
      (ticket.owner || ticket.name || "?").charAt(0).toUpperCase();

    /**
     * Retorna o emoji de ícone do canal associado ao ticket.
     * @param {Object} ticket - Objeto do ticket.
     * @returns {string}
     */
    const getChannelIconByTicket = (ticket) => {
      const channel = channels.value.find((c) => c.id === ticket.channelId);
      if (!channel) return "💬";
      return channel.type === "whatsapp" ? "📱" : "✈️";
    };
    /**
     * Traduz o status interno para texto legível em português.
     * @param {string} status - Status do ticket.
     * @returns {string}
     */
    function getStatusText(status) {
      const MAP = {
        pending: "Pendente",
        open: "Em atendimento",
        atendendo: "Em atendimento",
        closed: "Finalizado",
      };
      return MAP[status] || status;
    }
    /**
     * Formata um timestamp (ISO, numérico ou string) para exibição.
     * Mostra apenas hora se for hoje; data + hora caso contrário.
     * @param {string|number} dateString - Data da mensagem.
     * @returns {string}
     */
    function formatTime(dateString) {
      if (!dateString) return "";

      const date = /^\d+$/.test(String(dateString))
        ? new Date(parseInt(dateString, 10))
        : new Date(dateString);

      if (isNaN(date.getTime())) return "Data inválida";

      const today = new Date();
      const isToday =
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();

      const timeStr = date.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });

      if (isToday) return timeStr;

      const dateStr = date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
      });
      return `${dateStr} às ${timeStr}`;
    }

    // =========================================================================
    // 13. Graficos
    // =========================================================================

    // ========== ESTATÍSTICAS REATIVAS ==========

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
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
    );
    const dataFim = ref(new Date().toISOString().split("T")[0]);

    let chartHandler = null;
    let chartHandler2 = null;
    let chartHandler3 = null;
    const chartType = ref("bar");
    // ========== FUNÇÃO PARA CRIAR MAPA DE USUÁRIOS ==========
    const getUserMap = () => {
      const map = new Map();
      users.value.forEach((user) => {
        map.set(user.id, user.name);
      });
      return map;
    };
    // ========== FUNÇÃO PARA CRIAR MAPA DE CANAIS ==========
    const getChannelMap = () => {
      const map = new Map();
      channels.value.forEach((channel) => {
        map.set(channel.id, channel.type);
      });
      return map;
    };

    // Converte userId para nome antes de processar
    const processTicketsByUser = (data) => {
      const userMap = getUserMap();
      const userCount = {};

      data
        .filter((ticket) => {
          const ticketDate = ticket.createdAt.split("T")[0];
          return ticketDate >= dataInicio.value && ticketDate <= dataFim.value;
        })
        .forEach((ticket) => {
          // Converte o userId para nome
          const userName = userMap.get(ticket.userId) || "Ticket Pendente";
          userCount[userName] = (userCount[userName] || 0) + 1;
        });
      return {
        categories: Object.keys(userCount),
        values: Object.values(userCount),
        countMap: userCount,
      };
    };
    // Converte channel para Type antes de processar
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
      // Ordena as categorias por data (do mais antigo para o mais novo)
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

      // const dat = processTicketsByDate(allTickets.value);
      // console.log(dat);
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
    // Computed properties baseadas nas statsData reativas
    const totalTickets = computed(() => statsDataChannel.value.totalTickets);
    const topChannel = computed(() => statsDataChannel.value.topChannel);

    // Função para limpar todos os recursos da aba gráficos
    const limparRecursosGraficos = () => {
      // Limpar dados reativos
      statsDataChannel.value = {
        totalTickets: 0,
        topChannel: "Nenhum",
      };

      // Array com todos os charts para limpar facilmente
      const charts = [chartHandler, chartHandler2, chartHandler3];

      charts.forEach((chart, index) => {
        if (chart && typeof chart.dispose === "function") {
          try {
            chart.dispose();
            console.log(`Chart ${index + 1} destruído`);
          } catch (error) {
            console.error(`Erro ao destruir chart ${index + 1}:`, error);
          }
        }
      });
      chartHandler = null;
      chartHandler2 = null;
      chartHandler3 = null;
    };
    // =========================================================================
    // 14. INICIALIZAÇÃO
    // =========================================================================
    onMounted(async () => {
      // 1. Verifica autenticação antes de qualquer coisa
      if (!checkAuthentication()) return;

      // 3. Conecta ao socket para eventos em tempo real
      initSocket();

      // 4. Carrega dados iniciais em paralelo
      await Promise.all([loadTickets(), loadChannels(), loadUsers()]);

      // Registrar evento para pegar evento so service worker
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          navigator.serviceWorker.addEventListener("message", handleSWMessage);
        });
      }

      // updateStatistics();
    });

    // Lifecycle: cleanup service worker
    onUnmounted(() => {
      navigator.serviceWorker.removeEventListener("message", handleSWMessage);
      socket.disconnect();
      if (chartHandler && typeof chartHandler.dispose === "function") {
        chartHandler.dispose();
        chartHandler = null;
      }

      if (chartHandler2 && typeof chartHandler2.dispose === "function") {
        chartHandler2.dispose();
        chartHandler2 = null;
      }

      if (chartHandler3 && typeof chartHandler3.dispose === "function") {
        chartHandler3.dispose();
        chartHandler3 = null;
      }
    });
    // document.addEventListener(
    //   "click",
    //   () => {
    //     requestNotificationPermission();
    //   },
    //   { once: true },
    // );

    //
    //  Watcher
    //
    // Observar mudanças nos tickets
    watch(
      () => allTickets.value.length,
      () => {
        //updateStatistics();
        chartHandler?.updateData();
      },
    );

    // );
    watch(
      editingChannel,
      (newChannel) => {
        loadChannelForEdit(newChannel);
      },
      { deep: true, immediate: true },
    );
    watch(activeTab, (tabNovo, tabAntigo) => {
      if (tabAntigo === "chats") {
        currentTicket.value = null;
        currentMessages.value = [];
      }
      if (tabAntigo === "graficos") {
        limparRecursosGraficos();
      }
    });
    // =========================================================================
    // EXPOSIÇÃO DO SETUP (retorno para o template Vue)
    // =========================================================================

    return {
      // Estado
      activeTab,
      sidebarOpen,
      configSubtab,
      userMenuOpen,
      socketConnected,
      isAuthenticated,
      currentUser,
      allTickets,
      currentTicket,
      searchTerm,
      showOnlyClosed,
      loadingTickets,
      loadingMessages,
      loadingUsers,
      loadingChannels,
      updatedTickets,
      currentMessages,
      tempMessages,
      newMessageText,
      fileInput,
      selectedFiles,
      users,
      userModalVisible,
      editingUser,
      channels,
      currentChannelId,
      channelModalVisible,
      selectedChannelType,
      newChannelName,
      newChannelToken,
      newChannelNumber,
      businessAccountId,
      accessToken,
      phoneNumberId,
      broadcastModalVisible,
      broadcastFileInput,
      broadcastChannelId,
      broadcastNumber,
      broadcastMessage,
      broadcastFileName,
      selectedBroadcastFiles,
      sendingBroadcast,
      showAlerta,
      assinarMensagem,

      // Alerta
      alertaMessage,
      isSuccess,

      // Computed
      filteredTickets,
      allMessages,
      filteredUsers,
      isAdmin,

      // Autenticação
      toggleUserMenu,
      closeUserMenu,
      handleLogout,

      // Channel
      disconnectChannel,
      refreshChannel,
      connectChannel,
      createChannel,
      openAddChannelModal,
      selectChannelType,
      editingChannel,
      editChannel,
      closeChannelModal,

      // Usuarios
      openUserModal,
      saveUser,
      deleteUser,
      editUser,

      // Tickets
      selectTicket,
      attendTicket,
      closeTicket,
      reopenTicket,
      loadTickets,
      loadMessages,
      updateSearchTerm,

      // Mensagens e arquivos

      triggerFileInput,
      handleFileSelect,
      removeFile,
      sendFiles,
      sendMessage,
      getMediaUrl,
      openInNewTab,
      getFileName,
      getFileExtension,
      isDocumentWithoutCaption,
      getFileIcon,

      // QrCoode
      qrCodeContainerRef,
      qrCodeModalVisible,
      qrcodeImage,
      qrString,
      isLoading,
      statusMessage,
      statusClass,
      closeQRCodeModal,
      showPairingCode,
      isPairingCode,
      // Broadcast
      openBroadcastModal,
      triggerBroadcastFile,
      handleBroadcastFileSelect,
      removeBroadcastFile,
      sendBroadcastMessage,

      // UI e formatação
      toggleSidebar,
      formatMessage,
      getTicketAvatar,
      getChannelIconByTicket,
      getStatusText,
      formatTime,

      // GRAFICOS
      chartRefCanal,
      chartRefUsuario,
      chartRefData,
      dataInicio,
      dataFim,
      consultar,
      statusMsg,
      totalTickets,
      topChannel,
    };
  },
}).mount("#app");
