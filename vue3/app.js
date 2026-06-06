/**
 * @file app.js
 * @description Ponto de entrada da aplicação Vue 3 (CDN).
 * Monta os composables e expõe o estado para o template.
 */

const STATUS = {
  CONNECTING: "connecting",
  LOADING: "loading",
  ERROR: "error",
  EXPIRED: "expired",
  SUCCESS: "success",
};

const {
  createApp,
  ref,
  computed,
  onMounted,
  nextTick,
  watch,
  onUnmounted,
  defineComponent,
  inject,
  provide,
} = Vue;

// Carrega um template HTML externo e retorna um componente Vue compilado
async function loadComponent(path, setupFn) {
  const res = await fetch(path);
  const template = await res.text();

  return defineComponent({ template, setup: setupFn });
}
// Função que injeta os dados automaticamente
const autoInject = () => inject("appContext");
async function initApp() {
  // Carrega todos os templates em paralelo antes de montar o app
  const [
    TabChats,
    ConfigUsers,
    ConfigChannels,
    TabGraficos,
    AppModals,
    ConfigIntegracao,
    TabDashboard,
    TabFlow,
    ConfigSettings
  ] = await Promise.all([
    loadComponent("./templates/tab-chats.html", autoInject),
    loadComponent("./templates/config-users.html", autoInject),
    loadComponent("./templates/config-channels.html", autoInject),
    loadComponent("./templates/tab-graficos.html", autoInject),
    loadComponent("./templates/modals.html", autoInject),
    loadComponent("./templates/config-integracoes.html", autoInject),
    loadComponent("./templates/tab-dashboard.html", autoInject),
    loadComponent("./templates/tab-flow.html", autoInject),
    loadComponent("./templates/config-settings.html", autoInject),
    
  ]);

  const app = createApp({
    setup() {
      // =========================================================================
      // 1. CONFIGURAÇÃO E CONSTANTES
      // =========================================================================
      // const URL_BASE = "https://fast.panelapps.site";
      const URL_BASE = "http://localhost:3000";

      let token = ref("");
      let webllm = null;
      let aiEngine = null;
      const aiLoading = ref(false);
      const webllmModule = ref(false);
      // =========================================================================
      // 2. ESTADO GLOBAL (compartilhado entre módulos)
      // =========================================================================
      const activeTab = ref("chats");
      const sidebarOpen = ref(false);
      const configSubtab = ref("users");
      const userMenuOpen = ref(false);
      const socketConnected = ref(false);
      const showAlerta = ref(false);
      const alertaMessage = ref("");
      const isSuccess = ref(true);
      const isAuthenticated = ref(false);
      const currentUser = ref(null);
      const ticketNovo = ref("");
      // Socket exposto como ref para os módulos acessarem reativamente
      const socketRef = ref(null);




      // =========================================================================
      // 3. UTILITÁRIOS (usados por múltiplos módulos)
      // =========================================================================
      const sonnerAlert = (msg, success = true) => {
        showAlerta.value = true;
        isSuccess.value = success;
        alertaMessage.value = msg;
        setTimeout(() => (showAlerta.value = false), 3000);
      };

      const toggleSidebar = () => {
        sidebarOpen.value = !sidebarOpen.value;
      };

      const formatMessage = (text) => formatarMensagem(text);

      const getStatusText = (status) => {
        const MAP = {
          pending: "Pendente",
          open: "Em atendimento",
          atendendo: "Em atendimento",
          closed: "Finalizado",
        };
        return MAP[status] || status;
      };

      const formatTime = (dateString) => {
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
      };

      async function initAI() {
        if (aiEngine) return aiEngine;

        aiLoading.value = true;

        try {
          aiEngine = await webllmModule.value.CreateMLCEngine(
            "Llama-3.2-1B-Instruct-q4f16_1-MLC",
            {
              initProgressCallback: console.log,
            },
          );

          return aiEngine;
        } finally {
          aiLoading.value = false;
        }
      }

      // =========================================================================
      // 4. AUTENTICAÇÃO
      // =========================================================================
      const toggleUserMenu = () => {
        userMenuOpen.value = !userMenuOpen.value;
      };
      const closeUserMenu = () => {
        userMenuOpen.value = false;
      };
      const redirectToLogin = () => {
        window.location.href = "login.html";
      };
      const clearSession = () => {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user_data");
      };
      const handleLogout = () => {
        clearSession();
        redirectToLogin();
      };

      const checkAuthentication = () => {
        const storedToken = localStorage.getItem("auth_token");
        token.value = storedToken;
        const userData = localStorage.getItem("user_data");
        if (!storedToken || !userData) {
          redirectToLogin();
          return false;
        }
        try {
          const payload = JSON.parse(atob(storedToken.split(".")[1]));
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

      // =========================================================================
      // 5. NOTIFICAÇÕES
      // =========================================================================
      const notifications = useNotifications({
        playNotificationSound: () =>
          new Audio(
            "https://notificationsounds.com/storage/sounds/file-sounds-1147-that-was-quick.mp3",
          ).play(),
        openChat: (ticket) => tickets.selectTicket(ticket),
      });

      async function requestNotificationPermission() {
        if (!("Notification" in window)) return false;
        if (Notification.permission === "granted") return true;
        if (Notification.permission !== "denied") {
          return (await notifications.requestPermission()) === "granted";
        }
        return false;
      }

      // =========================================================================
      // 6. COMPOSABLES (módulos)
      // =========================================================================
      const shared = { URL_BASE, token, currentUser, sonnerAlert };

      const qrCode = useQrCode({ STATUS, sonnerAlert });

      const channels = useChannels({ ...shared });

      const users = useUsers({ ...shared });

      const integracoes = useIntegracao({ ...shared });

      const tickets = useTickets({
        ...shared,
        socket: socketRef,
        channels: channels.channels,
      });

      const flow = useFlow({
        ...shared,
        ticketNovo,
        initAI,
        aiEngine,
      });
      const settings = UseSettings()
      const broadcast = useBroadcast({ ...shared });
      const dashboard = useDashboard({
        allTickets: tickets.allTickets,
        users: users.users,
        channels: channels.channels,
      });
      const graficos = useGraficos({
        allTickets: tickets.allTickets,
        users: users.users,
        channels: channels.channels,
      });

      // =========================================================================
      // 7. COMPUTED que dependem de múltiplos módulos
      // =========================================================================
      const getTicketAvatar = (ticket) =>
        (ticket.owner || ticket.name || "?").charAt(0).toUpperCase();

      const getChannelIconByTicket = (ticket) => {
        const channel = channels.channels.value.find(
          (c) => c.id === ticket.channelId,
        );
        if (!channel) return "💬";
        return channel.type === "whatsapp"
          ? "📱"
          : channel.type === "telegram"
            ? "✈️"
            : "🕸️";
      };

      // =========================================================================
      // 8. SOCKET.IO
      // =========================================================================
      function initSocket() {
        if (socketRef.value?.connected) return;

        const socket = io(`${URL_BASE}/client`, {
          transports: ["websocket", "polling"],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          auth: { token: token.value },
        });
        socketRef.value = socket;

        socket.on("connect", () => {
          socketConnected.value = true;
        });
        socket.on("disconnect", () => {
          socketConnected.value = false;
        });
        socket.on("connect_error", (error) => {
          console.error("Erro Socket.IO:", error);
        });

        socket.on("ChatClientDesconectado", (data) => {
          if (tickets.currentTicket.value?.id === parseInt(data.ticketId)) {
            sonnerAlert(
              "Mensagem não enviada: o cliente não está mais conectado ao chat.",
              false,
            );
            tickets.tempMessages.value = [];
          }
        });

        socket.on("new-message", async (message) => {
          const ticket = tickets.allTickets.value.find(
            (t) => t.id === message.ticketid,
          );
          const ticketName =
            ticket?.owner || ticket?.name || `Ticket ${message.ticketid}`;
          const isIncoming =
            !message.fromMe &&
            ticket &&
            ticket.status !== "pending" &&
            currentUser.value.id === ticket.userId;

          if (isIncoming) {
            notifications.show({
              body: message.body?.substring(0, 60) || "Nova mensagem",
              ticketId: ticket.id,
              contato: `💬 Nova mensagem de ${ticketName}`,
            });
            sonnerAlert(`Nova mensagem de ${ticketName}`);
            tickets.scrollToBottom(ticket.id);
          }

          if (ticket) {
            if (!ticket.messages) ticket.messages = [];
            ticket.messages.unshift(message);
            ticket.lastMessage = message.body;
            ticket.lastMessageAt = message.createdAt;
          }

          if (tickets.currentTicket.value?.id === message.ticketid) {
            await tickets.loadMessages(tickets.currentTicket.value.id);
          }
        });

        socket.on("ticket-updated", async (data) => {
          if (data.status === "pending" && data.previousStatus !== "pending") {
            ticketNovo.value = data;
            const name = data.owner || data.name || `Ticket ${data.id}`;
            notifications.show({
              body: data.lastMessage,
              ticketId: data.id,
              contato: `🆕 Novo ticket pendente ${name}`,
            });
          }
          tickets.updateSingleTicket(data);
          const ch2 = graficos.getChartHandler2();
          if (ch2) ch2.render();
        });

        socket.on("ChatWebFechado", (data) => {
          const ticket = tickets.allTickets.value.find(
            (t) => t.socketId === data.socket,
          );
          if (!ticket) return;
          if (tickets.currentTicket.value?.id === ticket.id) {
            sonnerAlert(data.msg, false);
          }
        });

        socket.on("channel-update", (data) => {
          const isCurrentChannel =
            channels.currentChannelId.value &&
            channels.currentChannelId.value === (data.channelId || data.id);
          if (!isCurrentChannel) return;

          if (data.status === "qrcode" && data.qrcode) {
            qrCode.generateQRCode(data.qrcode);
          }
          if (data.pairingCode) {
            qrCode.isPairingCode.value = true;
            qrCode.showPairingCode.value = data.pairingCode;
          }
          if (data.status === "CONNECTED") {
            sonnerAlert("Canal conectado");
            qrCode.updateQRCodeStatus(STATUS.SUCCESS, true);
            setTimeout(() => {
              qrCode.qrCodeModalVisible.value = false;
              channels.updateSingleChannel(data);
            }, 2000);
          }
        });
      }

      // =========================================================================
      // 9. SERVICE WORKER
      // =========================================================================
      const handleSWMessage = (event) => {
        if (event.data?.type === "NOTIFICATION_CLICK") {
          tickets.selectTicket(event.data.payload.ticket);
        }
      };

      // =========================================================================
      // 10. WATCHERS
      // =========================================================================
      watch(
        () => tickets.allTickets.value.length,
        () => {
          graficos.getChartHandler2()?.updateData();
        },
      );

      watch(
        channels.editingChannel,
        (newChannel) => {
          channels.loadChannelForEdit(newChannel);
        },
        { deep: true, immediate: true },
      );

      watch(activeTab, (tabNovo, tabAntigo) => {
        if (tabAntigo === "chats") {
          tickets.currentTicket.value = null;
          tickets.currentMessages.value = [];
        }
        if (tabAntigo === "graficos") {
          graficos.limparRecursosGraficos();
        }
      });

      watch(tickets.currentTicket, (newId, oldId) => {
        if (socketRef.value?.connected) {
          if (oldId) socketRef.value.emit("leave-ticket", oldId.id);
          if (newId) socketRef.value.emit("join-ticket", newId.id);
        }
      });
      async function getWebLLM() {
        if (!webllmModule.value) {
          webllmModule.value =
            await import("https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.84/lib/index.min.js");
        }

        return webllmModule.value;
      }
      // =========================================================================
      // 11. LIFECYCLE
      // =========================================================================
      onMounted(async () => {
        if (!checkAuthentication()) return;
        initSocket();
        await Promise.all([
          tickets.loadTickets(),
          channels.loadChannels(),
          users.loadUsers(),
          integracoes.loadIntegracao(),
        ]);
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.ready.then(() => {
            navigator.serviceWorker.addEventListener(
              "message",
              handleSWMessage,
            );
          });
        }

        getWebLLM();
      });

      onUnmounted(() => {
        navigator.serviceWorker.removeEventListener("message", handleSWMessage);
        socketRef.value?.disconnect();
        graficos.limparRecursosGraficos();
      });
      async function promptSalvar() {
        const nome = window.prompt("Nome do flow:", "Meu Flow");
        if (!nome) return;
        const gatilho = window.prompt("gatilho:", "");

        await flow.salvarFlow(nome, gatilho);
      }
      const allData = {
        // Tickets
        ...tickets,
        // Canais
        ...channels,
        // Usuários
        ...users,
        // QR Code
        ...qrCode,
        // Broadcast
        ...broadcast,
        // Gráficos
        ...graficos,
        // Integracoes
        ...integracoes,
        // Flow
        ...flow,
        // Settings
        ...settings,
        promptSalvar,
        // Estado global
        ...shared,
        activeTab,
        sidebarOpen,
        configSubtab,
        userMenuOpen,
        socketConnected,
        isAuthenticated,
        currentUser,
        showAlerta,
        alertaMessage,
        isSuccess,

        ...dashboard,
        // Autenticação
        toggleUserMenu,
        closeUserMenu,
        handleLogout,

        // UI
        toggleSidebar,
        formatMessage,
        getTicketAvatar,
        getChannelIconByTicket,
        getStatusText,
        formatTime,
        // teste
        sonnerAlert,
        webllm,
 
      };

      provide("appContext", allData);
      // =========================================================================
      // 12. RETURN (exposição para o template)
      // =========================================================================
      return { ...allData };
    },
  });

  // Registra os componentes globalmente antes do mount
  app.component("tab-chats", TabChats);
  app.component("tab-graficos", TabGraficos);
  app.component("app-modals", AppModals);
  app.component("config-users", ConfigUsers);
  app.component("config-channels", ConfigChannels);
  app.component("config-integracao", ConfigIntegracao);
  app.component("tab-dashboard", TabDashboard);
  app.component("tab-flow", TabFlow);
  app.component("config-settings", ConfigSettings);
  

  app.mount("#app");
}
initApp();
// =========================================================================
// Helper: extrai chaves de um objeto composable
// =========================================================================
function pickFrom(obj, keys) {
  return keys.reduce((acc, key) => {
    if (key in obj) acc[key] = obj[key];
    return acc;
  }, {});
}
