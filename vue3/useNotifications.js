// useNotifications.js
// Compatível com Vue 3 via CDN (vue.global.js)
// NÃO usa type="module" — carregue com <script src="useNotifications.js"></script>
// ANTES do seu script principal.

(function (global) {
  const { ref, readonly } = Vue;

  // ─── Helper: formata hora atual HH:mm ──────────────────────────────────────
  function formatTime(date) {
    date = date || new Date();
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // ─── Helper: detecta mobile ────────────────────────────────────────────────
  function isMobile() {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  // ─── Composable ────────────────────────────────────────────────────────────

  /**
   * @param {Object} initialCallbacks
   * @param {(data: object) => void}               [initialCallbacks.onNotificationClick]
   * @param {() => void}                           [initialCallbacks.playNotificationSound]
   * @param {(ticket: object) => void}             [initialCallbacks.openChat]
   * @param {(ticketId: number, router: any) => void} [initialCallbacks.goToChat]
   * @param {(data: object) => void}               [initialCallbacks.onSWMessage] // NOVO
   */
  function useNotifications(initialCallbacks) {
    initialCallbacks = initialCallbacks || {};

    const permission = ref(
      "Notification" in window ? Notification.permission : "denied",
    );

    const callbacks = ref(Object.assign({}, initialCallbacks));

    // ─── NOVO: Referência para o Service Worker ──────────────────────────────
    let swRegistration = null;
    let isSWReady = false;
    let pendingMessages = [];

    // ── Configuração ──────────────────────────────────────────────────────

    function setCallbacks(newCallbacks) {
      callbacks.value = Object.assign({}, callbacks.value, newCallbacks);
    }

    // ── Permissão ─────────────────────────────────────────────────────────

    async function requestPermission() {
      if (!("Notification" in window)) {
        console.warn("[useNotifications] Navegador não suporta notificações.");
        return "denied";
      }

      if ("serviceWorker" in navigator) {
        try {
          console.log("[useNotifications] Registrando ServiceWorker");
          swRegistration = await navigator.serviceWorker.register("/sw.js", {
            updateViaCache: "none",
          });

          // Aguarda o SW ficar ativo
          await navigator.serviceWorker.ready;
          isSWReady = true;

          // Conecta o WebSocket no SW
          await connectSWWebSocket();

          // Busca mensagens pendentes
          await getPendingMessages();

          // Escuta mensagens do SW
          navigator.serviceWorker.addEventListener("message", handleSWMessage);

          console.log(
            "[useNotifications] ✅ Service Worker pronto e conectado",
          );
        } catch (err) {
          console.warn("[useNotifications] Falha ao registrar SW:", err);
        }
      }

      if (Notification.permission === "granted") {
        permission.value = "granted";
        return "granted";
      }

      if (Notification.permission !== "denied") {
        const result = await Notification.requestPermission();
        permission.value = result;
        return result;
      }

      permission.value = Notification.permission;
      return Notification.permission;
    }

    // ─── NOVO: Comunicação com o Service Worker ──────────────────────────────

    /**
     * Envia mensagem para o Service Worker
     */
    function sendToSW(type, payload = null) {
      if (!isSWReady || !swRegistration?.active) {
        console.warn("[useNotifications] SW não está pronto");
        return false;
      }

      try {
        swRegistration.active.postMessage({ type, payload });
        return true;
      } catch (error) {
        console.error("[useNotifications] Erro ao enviar para SW:", error);
        return false;
      }
    }

    /**
     * Conecta o WebSocket no Service Worker
     */
    async function connectSWWebSocket() {
      return sendToSW("SW_CONNECT");
    }

    /**
     * Busca mensagens pendentes (quando navegador estava fechado)
     */
    async function getPendingMessages() {
      if (!isSWReady) return [];

      return new Promise((resolve) => {
        const channel = new MessageChannel();

        channel.port1.onmessage = (event) => {
          const { type, messages } = event.data || {};

          if (type === "SW_PENDING_MESSAGES" && messages?.length > 0) {
            console.log(
              `[useNotifications] 📦 ${messages.length} mensagens pendentes`,
            );
            pendingMessages = messages;

            // Processa cada mensagem pendente
            messages.forEach((msg) => {
              // Mostra notificação para cada mensagem pendente
              show(msg);
            });

            resolve(messages);
          } else {
            resolve([]);
          }
        };

        try {
          swRegistration.active.postMessage(
            {
              type: "SW_GET_PENDING",
            },
            [channel.port2],
          );
        } catch (error) {
          console.error("[useNotifications] Erro ao buscar pendentes:", error);
          resolve([]);
        }
      });
    }
    // ⭐ NOVA FUNÇÃO: Toca o som (executada no contexto da ABA)
    function playNotificationSound() {
      try {
        // Usa o callback se foi fornecido
        if (callbacks.value.playNotificationSound) {
          callbacks.value.playNotificationSound();
          return;
        }

        // Fallback: toca som padrão
        const audio = new Audio(
          "https://notificationsounds.com/storage/sounds/file-sounds-1147-that-was-quick.mp3",
        );
        audio.play().catch((err) => {
          console.warn("⚠️ Não foi possível tocar áudio:", err);
        });
      } catch (error) {
        console.warn("⚠️ Erro ao tocar som:", error);
      }
    }
    /**
     * Handler para mensagens vindas do Service Worker
     */
    function handleSWMessage(event) {
      const { type, payload } = event.data || {};
      console.log("[useNotifications] 📨 Mensagem do SW:", type, payload);

      switch (type) {
        case "NEW_MESSAGE":
          // Mensagem recebida via WebSocket em background
          console.log(
            "[useNotifications] 💬 Nova mensagem em background:",
            payload,
          );
          // Exibe notificação
          show(payload);

          // Chama callback se existir
          if (callbacks.value.onSWMessage) {
            callbacks.value.onSWMessage(payload);
          }
          break;

        case "NOTIFICATION_CLICK":
          // Usuário clicou na notificação
          console.log("[useNotifications] 👆 Notificação clicada:", payload);

          if (callbacks.value.onNotificationClick) {
            callbacks.value.onNotificationClick(payload);
          }
          break;

        case "SW_STATUS":
          // Status da conexão
          console.log("[useNotifications] 🔌 Status SW:", payload);
          break;

        default:
          console.log("[useNotifications] 📬 Mensagem não tratada:", type);
      }
    }

    /**
     * Envia mensagem via WebSocket do Service Worker
     */
    function sendMessageViaSW(data) {
      return sendToSW("SW_SEND_MESSAGE", data);
    }

    // ── Helpers internos ──────────────────────────────────────────────────

    function _canShow() {
      return "Notification" in window && Notification.permission === "granted";
    }

    function _getContactName(data) {
      return data.contato || data.contactName || data.title || "Contato";
    }

    function _buildMessage(data) {
      return data.body || data.content || data.message || "";
    }

    function _buildOptions(data) {
      const body = _buildMessage(data);
      const time = formatTime();
      const ticketId = data.ticketid || data.ticketId || data.id || "default";
      const icon =
        data.icon || "https://cdn-icons-png.flaticon.com/512/2645/2645897.png";

      return {
        body: body ? `${body} — ${time}` : time,
        icon,
        tag: `ticket-${ticketId}`,
        requireInteraction: true,
        silent: false,
        renotify: true,
        vibrate: [200, 100, 200],
        data: {
          ticket: data,
          ticketId: ticketId,
          url: data.url || `/ticket/${ticketId}`,
        },
      };
    }

    function _handleClick(data) {
      return function () {
        if (document.hidden) window.focus();

        // Callback principal
        if (callbacks.value.onNotificationClick) {
          callbacks.value.onNotificationClick(data);
          return;
        }

        // Fallback: tenta abrir o chat
        const ticket = data.ticketid || data.ticketId || data;
        if (ticket) {
          callbacks.value.openChat?.(ticket);
          if (callbacks.value.goToChat) {
            const router = window.$router || null;
            callbacks.value.goToChat(ticket, router);
          }
        }
      };
    }

    // ── Estratégias de exibição ───────────────────────────────────────────

    async function _showViaServiceWorker(title, options, data) {
      if (!swRegistration) {
        // Tenta obter o registration
        swRegistration = await navigator.serviceWorker.getRegistration();
        if (!swRegistration) throw new Error("Service Worker não registrado.");
      }

      // Fecha duplicatas com a mesma tag
      const existing = await swRegistration.getNotifications({
        tag: options.tag,
      });
      existing.forEach((n) => n.close());

      await swRegistration.showNotification(title, {
        ...options,
        actions: [
          { action: "open_ticket", title: "🟢 Abrir Ticket" },
          { action: "dismiss", title: "❌ Fechar" },
        ],
        data: { ticket: data.ticketId || data.ticketid || data },
      });
    }

    function _showDirect(title, options, data) {
      const notification = new Notification(title, options);

      notification.onclick = _handleClick(data);
    }

    // ── Método principal ──────────────────────────────────────────────────

    async function show(data) {
      if (!_canShow()) {
        console.warn("[useNotifications] Sem permissão para notificar");
        return;
      }
      const title = _getContactName(data);
      const options = _buildOptions(data);
      const hasSW = "serviceWorker" in navigator && swRegistration;

      try {
        if (hasSW) {
          try {
            await _showViaServiceWorker(title, options, data);
          } catch (err) {
            console.warn(
              "[useNotifications] Fallback para notificação direta:",
              err,
            );
            if (!isMobile()) {
              _showDirect(title, options, data);
            }
          }
        } else if (!isMobile()) {
          _showDirect(title, options, data);
        } else {
          console.warn("[useNotifications] Notificação bloqueada no mobile");
        }
      } catch (err) {
        console.error("[useNotifications] Erro ao exibir notificação:", err);
      } finally {
        // Toca som se houver callback
        if (callbacks.value.playNotificationSound) {
          callbacks.value.playNotificationSound();
        }
      }
    }

    // ── Alias para compatibilidade ──────────────────────────────────────

    function handleNotifications(data) {
      show(data);
    }

    // ─── NOVO: Limpeza ────────────────────────────────────────────────────────

    function cleanup() {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker?.removeEventListener(
          "message",
          handleSWMessage,
        );
      }
      sendToSW("SW_DISCONNECT");
      isSWReady = false;
      swRegistration = null;
    }

    // ── Retorno ──────────────────────────────────────────────────────────────

    return {
      permission: readonly(permission),
      requestPermission,
      setCallbacks,
      show,
      handleNotifications,
      // NOVOS métodos
      sendMessageViaSW,
      handlePlaySound: playNotificationSound,
      connectSWWebSocket,
      getPendingMessages,
      cleanup,
      isSWReady: readonly(ref(isSWReady)),
      pendingMessages: readonly(ref(pendingMessages)),
    };
  }

  // Expõe globalmente — acessível como window.useNotifications(...)
  global.useNotifications = useNotifications;
})(window);
