const { createApp, ref, computed, onMounted, onUnmounted, nextTick } = Vue;

createApp({
  setup() {
    // ========== DADOS REATIVOS ==========
    const activeTab = ref("chats");
    const configSubtab = ref("users");
    // Socket
    const socketConnected = ref(false);
    let socket = null;
    // Tickets e mensagens
    const allTickets = ref([]);
    const currentTicket = ref(null);
    const currentMessages = ref([]);
    const searchTerm = ref("");
    const showOnlyClosed = ref(false);
    const loadingTickets = ref(false);
    const loadingMessages = ref(false);
    const newMessageText = ref("");
    // Usuários
    const users = ref([]);
    const loadingUsers = ref(false);
    const userModalVisible = ref(false);
    const editingUser = ref({
      name: "",
      email: "",
      role: "atendente",
      status: "ativo",
    });
    // Canais
    const channels = ref([]);
    const loadingChannels = ref(false);
    // QR Code
    const qrcodeModalVisible = ref(false);
    let currentChannelId = null;
    // Computed: tickets filtrados
    const filteredTickets = computed(() => {
      let filtered = allTickets.value.filter((t) => {
        const matchName = (t.owner || t.name || "")
          .toLowerCase()
          .includes(searchTerm.value.toLowerCase());
        const matchStatus = showOnlyClosed.value
          ? t.status === "closed"
          : t.status !== "closed";
        return matchName && matchStatus;
      });
      return filtered.sort(
        (a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0),
      );
    });

    // ========== FUNÇÕES DE TICKETS ==========
    const loadTickets = async () => {
      loadingTickets.value = true;
      try {
        const res = await fetch("http://localhost:3000/api/v1/tickets");
        const data = await res.json();
        allTickets.value = data.tickets || data;
      } catch (e) {
        console.error(e);
      } finally {
        loadingTickets.value = false;
      }
    };

    const selectTicket = async (ticketId) => {
      currentTicket.value = allTickets.value.find((t) => t.id === ticketId);
      if (!currentTicket.value) return;
      loadingMessages.value = true;
      if (socket && socket.connected) socket.emit("join-ticket", ticketId);
      const ticket = allTickets.value.find((t) => t.id === ticketId);
      let messages = ticket?.messages ? [...ticket.messages].reverse() : [];
      currentMessages.value = messages;
      loadingMessages.value = false;
      await nextTick();
      const area = document.getElementById("messagesArea");
      if (area) area.scrollTop = area.scrollHeight;
    };

    const sendMessage = async () => {
      if (!currentTicket.value || !newMessageText.value.trim()) return;
      const text = newMessageText.value;
      newMessageText.value = "";
      try {
        const formData = new FormData();
        formData.append("body", text);
        formData.append("fromMe", "true");
        await fetch(
          `http://localhost:3000/api/v1/messages/${currentTicket.value.id}`,
          { method: "POST", body: formData },
        );
        await loadMessages(currentTicket.value.id);
      } catch (e) {
        console.error(e);
        alert("Erro ao enviar");
      }
    };

    const loadMessages = async (ticketId) => {
      const ticket = allTickets.value.find((t) => t.id === ticketId);
      currentMessages.value = ticket?.messages
        ? [...ticket.messages].reverse()
        : [];
      await nextTick();
      const area = document.getElementById("messagesArea");
      if (area) area.scrollTop = area.scrollHeight;
    };
    const getStatusText = (status) => {
      const map = {
        pending: "Pendente",
        open: "Em atendimento",
        closed: "Finalizado",
      };
      return map[status] || status;
    };
    const formatTime = (date) =>
      date
        ? new Date(date).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";

    // Anexo de arquivo (simplificado)
    const triggerFileInput = () => {
      document.querySelector('input[type="file"]').click();
    };
    const handleFileSelect = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 25 * 1024 * 1024) return alert("Arquivo > 25MB");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fromMe", "true");
      await fetch(
        `http://localhost:3000/api/v1/messages/${currentTicket.value.id}`,
        { method: "POST", body: formData },
      );
      await loadMessages(currentTicket.value.id);
      e.target.value = "";
    };
    // ========== CRUD USUÁRIOS ==========
    const loadUsers = async () => {
      loadingUsers.value = true;
      try {
        const res = await fetch("http://localhost:3000/api/users");
        users.value = await res.json();
      } catch (e) {
        console.error(e);
      } finally {
        loadingUsers.value = false;
      }
    };
    const openUserModal = (user = null) => {
      if (user) editingUser.value = { ...user };
      else
        editingUser.value = {
          id: null,
          name: "",
          email: "",
          role: "atendente",
          status: "ativo",
        };
      userModalVisible.value = true;
    };
    const editUser = (user) => openUserModal(user);
    const saveUser = async () => {
      const user = editingUser.value;
      if (!user.name || !user.email) return alert("Preencha nome e email");
      const method = user.id ? "PUT" : "POST";
      const url = user.id
        ? `http://localhost:3000/api/users/${user.id}`
        : "http://localhost:3000/api/users";
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
      });
      userModalVisible.value = false;
      loadUsers();
    };
    const deleteUser = async (id) => {
      if (!confirm("Excluir usuário?")) return;
      await fetch(`http://localhost:3000/api/users/${id}`, {
        method: "DELETE",
      });
      loadUsers();
    };
    // ========== CANAIS ==========
    const loadChannels = async () => {
      loadingChannels.value = true;
      try {
        const res = await fetch("http://localhost:3000/api/v1/channel");
        channels.value = await res.json();
      } catch (e) {
        console.error(e);
      } finally {
        loadingChannels.value = false;
      }
    };
    const openAddChannelModal = () => {
      alert("Modal de adicionar canal - implemente conforme sua API");
    };
    const connectChannel = async (id) => {
      currentChannelId = id;
      qrcodeModalVisible.value = true;
      if (socket && socket.connected) socket.emit("join-channel", id);
      await fetch(`http://localhost:3000/api/v1/channel/${id}/connect`, {
        method: "POST",
      });
    };
    const disconnectChannel = async (id) => {
      if (!confirm("Desconectar canal?")) return;
      await fetch(`http://localhost:3000/api/v1/channel/${id}/disconnect`, {
        method: "POST",
      });
      loadChannels();
    };
    const closeQRCodeModal = () => {
      qrcodeModalVisible.value = false;
      if (socket && currentChannelId)
        socket.emit("leave-channel", currentChannelId);
      currentChannelId = null;
    };

    // ========== SOCKET.IO ==========
    const initSocket = () => {
      socket = io("http://localhost:3000", {
        transports: ["websocket", "polling"],
      });
      socket.on("connect", () => {
        socketConnected.value = true;
        console.log("Socket conectado");
      });
      socket.on("disconnect", () => {
        socketConnected.value = false;
      });
      socket.on("new-message", async (msg) => {
        await loadTickets();
        if (currentTicket.value?.id === msg.ticketid)
          await loadMessages(msg.ticketid);
      });
      socket.on("channel-update", (data) => {
        if (currentChannelId === (data.channelId || data.id) && data.qrcode) {
          const container = document.getElementById("qrcodeImage");
          container.innerHTML = "";
          new QRCode(container, { text: data.qrcode, width: 260, height: 260 });
        }
        if (data.status === "CONNECTED") {
          closeQRCodeModal();
          loadChannels();
        }
      });
    };

    // ========== MISC ==========
    const filterTickets = () => {}; // já reativo
    const handleKeyPress = (e) => {
      if (e.key === "Enter" && !e.shiftKey) sendMessage();
    };

    onMounted(() => {
      initSocket();
      loadTickets();
      loadUsers();
      loadChannels();
    });

    return {
      activeTab,
      configSubtab,
      socketConnected,
      allTickets,
      currentTicket,
      currentMessages,
      searchTerm,
      showOnlyClosed,
      loadingTickets,
      loadingMessages,
      newMessageText,
      filteredTickets,
      selectTicket,
      sendMessage,
      loadMessages,
      getStatusText,
      formatTime,
      triggerFileInput,
      handleFileSelect,
      users,
      loadingUsers,
      userModalVisible,
      editingUser,
      openUserModal,
      editUser,
      saveUser,
      deleteUser,
      channels,
      loadingChannels,
      openAddChannelModal,
      connectChannel,
      disconnectChannel,
      qrcodeModalVisible,
      closeQRCodeModal,
      filterTickets,
      handleKeyPress,
    };
  },
}).mount("#app");
