// public/sw.js - VERSÃO COMPLETA (Recomendada)

// ============================================
// CONFIGURAÇÕES
// ============================================
const WS_CONFIG = {
  url: "wss://nexus.devrenato.com.br/socket.io/?EIO=4&transport=websocket", // ← AJUSTE PARA SUA URL
  // url: "ws://localhost:3000/socket.io/?EIO=4&transport=websocket",
  heartbeatInterval: 25000,
  reconnectDelay: 3000,
  maxReconnectAttempts: 10,
};

let webSocket = null;
let heartbeatTimer = null;
let reconnectAttempts = 0;
let reconnectTimer = null;
let pendingMessages = [];
let isBrowserOpen = false;

// ============================================
// GERENCIAMENTO DO WEBSOCKET
// ============================================

function connectWebSocket() {
  if (
    webSocket?.readyState === WebSocket.OPEN ||
    webSocket?.readyState === WebSocket.CONNECTING
  ) {
    //console.log("⚠️ WebSocket já está conectado ou conectando");
    return;
  }

  //console.log("🔌 Conectando WebSocket em background...");

  try {
    webSocket = new WebSocket(WS_CONFIG.url);

    webSocket.onopen = () => {
      //console.log("✅ WebSocket conectado em background!");
      reconnectAttempts = 0;
      startHeartbeat();

      // Se havia mensagens pendentes, envia agora
      if (pendingMessages.length > 0) {
        //console.log(
        //   `📦 Enviando ${pendingMessages.length} mensagens pendentes...`,
        // );
        pendingMessages.forEach((msg) => handleBackgroundMessage(msg));
        pendingMessages = [];
      }
    };

    webSocket.onmessage = (event) => {
      //console.log("📩 Mensagem recebida em background:", event.data);

      try {
        const data = JSON.parse(event.data);
        handleBackgroundMessage(data);
      } catch (error) {
        handleBackgroundMessage({ raw: event.data });
      }
    };

    webSocket.onclose = (event) => {
      //console.log(`🔴 WebSocket fechado (código: ${event.code})`);
      stopHeartbeat();
      scheduleReconnect();
    };

    webSocket.onerror = (error) => {
      console.error("❌ Erro no WebSocket:", error);
    };
  } catch (error) {
    console.error("❌ Falha ao criar WebSocket:", error);
    scheduleReconnect();
  }
}

function startHeartbeat() {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    if (webSocket?.readyState === WebSocket.OPEN) {
      //console.log("💓 Heartbeat enviado");
      webSocket.send(JSON.stringify({ type: "ping" }));
    } else {
      console.warn("⚠️ WebSocket não está aberto para heartbeat");
      stopHeartbeat();
      if (webSocket?.readyState !== WebSocket.CONNECTING) {
        connectWebSocket();
      }
    }
  }, WS_CONFIG.heartbeatInterval);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return;

  if (reconnectAttempts >= WS_CONFIG.maxReconnectAttempts) {
    console.error("❌ Máximo de tentativas de reconexão atingido");
    return;
  }

  reconnectAttempts++;
  const delay = WS_CONFIG.reconnectDelay * Math.min(reconnectAttempts, 5);

  //console.log(
  //   `🔄 Tentando reconectar em ${delay}ms (tentativa ${reconnectAttempts})`,
  // );

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectWebSocket();
  }, delay);
}

// ============================================
// TRATAMENTO DE MENSAGENS
// ============================================

function checkIfBrowserIsOpen() {
  return self.clients.matchAll({ type: "window" }).then((clients) => {
    const hasWindow = clients.length > 0;
    isBrowserOpen = hasWindow;
    return hasWindow;
  });
}

function handleBackgroundMessage(data) {
  //console.log("📦 Processando mensagem em background:", data);

  const isNotification =
    data.type === "new_ticket" ||
    data.type === "notification" ||
    data.ticket ||
    data.title ||
    data.contato;

  if (isNotification) {
    checkIfBrowserIsOpen().then((isOpen) => {
      if (isOpen) {
        // Navegador aberto → exibe notificação
        //console.log("🟢 Navegador aberto, exibindo notificação");
        showNotification(data);
        sendToClients({ type: "NEW_MESSAGE", payload: data });
      } else {
        // Navegador fechado → guarda para quando abrir
        //console.log("🔴 Navegador fechado, armazenando mensagem");
        pendingMessages.push(data);
      }
    });
  }
}

function showNotification(data) {
  const title = data.contato || data.title || "Nova mensagem";
  const body =
    data.body || data.message || data.content || "Clique para visualizar";
  const ticketId = data.ticketid || data.ticketId || data.id || Date.now();

  const options = {
    body: body,
    icon:
      data.icon || "https://cdn-icons-png.flaticon.com/512/2645/2645897.png",
    badge: "/favicon.ico",
    tag: `ticket-${ticketId}`,
    requireInteraction: true,
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      ticket: data,
      ticketId: ticketId,
      url: data.url || `/ticket/${ticketId}`,
    },
    actions: [
      { action: "open_ticket", title: "🟢 Abrir Ticket" },
      { action: "dismiss", title: "❌ Dispensar" },
    ],
  };

  self.registration
    .showNotification(title, options)
    .then(() => console.log("🔔 Notificação exibida com sucesso"))
    .catch((error) => console.error("❌ Erro ao exibir notificação:", error));
}

function sendToClients(message) {
  self.clients
    .matchAll({
      type: "window",
      includeUncontrolled: true,
    })
    .then((clients) => {
      clients.forEach((client) => {
        client.postMessage(message);
      });
    });
}

// ============================================
// COMUNICAÇÃO COM A ABA (Via postMessage)
// ============================================

self.addEventListener("message", (event) => {
  const { type, payload } = event.data || {};

  //console.log("📨 Mensagem recebida da aba:", type, payload);

  switch (type) {
    case "SW_CONNECT":
      connectWebSocket();
      break;

    case "SW_SEND_MESSAGE":
      if (webSocket?.readyState === WebSocket.OPEN) {
        webSocket.send(JSON.stringify(payload));
        //console.log("📤 Mensagem enviada via SW:", payload);
      } else {
        console.warn("⚠️ WebSocket não está aberto para enviar mensagem");
      }
      break;

    case "SW_GET_STATUS":
      const status = {
        type: "SW_STATUS",
        connected: webSocket?.readyState === WebSocket.OPEN,
        readyState: webSocket?.readyState,
        pendingMessages: pendingMessages?.length || 0,
      };
      event.ports[0]?.postMessage(status);
      break;

    case "SW_GET_PENDING":
      const messages = {
        type: "SW_PENDING_MESSAGES",
        messages: pendingMessages || [],
      };
      event.ports[0]?.postMessage(messages);
      pendingMessages = [];
      break;

    case "SW_DISCONNECT":
      if (webSocket) {
        webSocket.close();
        webSocket = null;
        stopHeartbeat();
        //console.log("🔌 WebSocket desconectado pela aba");
      }
      break;

    default:
    //console.log("📬 Tipo de mensagem desconhecido:", type);
  }
});

// ============================================
// PUSH EVENT (Para navegador fechado)
// ============================================

self.addEventListener("push", (event) => {
  //console.log("📨 Push recebido:", event.data?.text());

  let data = {};
  try {
    data = event.data?.json() || {};
  } catch {
    data = { raw: event.data?.text() };
  }

  event.waitUntil(
    (async () => {
      // Verifica se o navegador está aberto
      const isOpen = await checkIfBrowserIsOpen();

      if (!isOpen) {
        //console.log("🔴 Navegador fechado, push recebido via FCM/APNS");
        pendingMessages.push(data);
      }

      // Exibe a notificação
      showNotification(data);

      // Tenta conectar WebSocket para pegar dados adicionais
      if (!webSocket || webSocket.readyState !== WebSocket.OPEN) {
        connectWebSocket();
      }
    })(),
  );
});

// ============================================
// INSTALAÇÃO E ATIVAÇÃO
// ============================================

self.addEventListener("install", (event) => {
  //console.log("Service Worker instalando...");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  //console.log("Service Worker ativado!");
  event.waitUntil(clients.claim());

  // Tenta conectar sempre
  connectWebSocket();

  // Verifica se há mensagens pendentes
  checkIfBrowserIsOpen().then((isOpen) => {
    if (isOpen && pendingMessages.length > 0) {
      //console.log(
      //   `📦 ${pendingMessages.length} mensagens pendentes encontradas`,
      // );
      pendingMessages.forEach((msg) => showNotification(msg));
      pendingMessages = [];
    }
  });
});

// ============================================
// CLIQUE NA NOTIFICAÇÃO
// ============================================

self.addEventListener("notificationclick", function (event) {
  const clickedNotification = event.notification;
  const action = event.action;

  clickedNotification.close();

  if (action === "dismiss") {
    //console.log("❌ Notificação dispensada.");
    return;
  }

  const ticketData = clickedNotification.data?.ticket;
  const urlToOpen =
    clickedNotification.data?.url || "https://atendimento.devrenato.com.br";

  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of allClients) {
        if (
          client.url.includes("atendimento.devrenato.com.br") ||
          client.url.includes("localhost:5173") ||
          client.url.includes("localhost:51333")
        ) {
          client.postMessage({
            type: "NOTIFICATION_CLICK",
            payload: { ticket: ticketData },
          });
          client.focus();
          return;
        }
      }

      //console.log("🌐 Nenhuma aba ativa — abrindo nova janela");
      await clients.openWindow(urlToOpen);
    })(),
  );
});
