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
   */
  function useNotifications(initialCallbacks) {
    initialCallbacks = initialCallbacks || {};

    const permission = ref(
      "Notification" in window ? Notification.permission : "denied",
    );

    const callbacks = ref(Object.assign({}, initialCallbacks));

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
          console.log("Registrando ServiceWorker");
          await navigator.serviceWorker.register("/sw.js", {
            updateViaCache: "none",
          });
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

    // ── Helpers internos ──────────────────────────────────────────────────

    function _canShow() {
      return "Notification" in window && Notification.permission === "granted";
    }

    function _getContactName(data) {
      return data.contato || "Contato";
    }

    function _buildMessage(data) {
      return data.body || data.content || "";
    }

    function _buildOptions(data) {
      const body = _buildMessage(data);
      const time = formatTime();
      const ticketId = data.ticketid || "default";
      const icon = "https://cdn-icons-png.flaticon.com/512/2645/2645897.png";

      return {
        body: body ? `${body} — ${time}` : time,
        icon,
        tag: `ticket-${ticketId}`,
        requireInteraction: true,
        silent: false,
        renotify: true,
        vibrate: [200, 100, 200],
      };
    }

    function _handleClick(data) {
      return function () {
        if (document.hidden) window.focus();
        if (callbacks.value.onNotificationClick) {
          callbacks.value.onNotificationClick(data);
          return;
        }

        const ticket = data.ticketid;
        if (!ticket) return;

        callbacks.value.openChat?.(ticket);

        if (ticket && callbacks.value.goToChat) {
          const router = window.$router || null;
          callbacks.value.goToChat(ticket.id, router);
        }
      };
    }

    // ── Estratégias de exibição ───────────────────────────────────────────

    async function _showViaServiceWorker(title, options, data) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) throw new Error("Service Worker não registrado.");

      // Fecha duplicatas com a mesma tag
      const existing = await registration.getNotifications({
        tag: options.tag,
      });
      existing.forEach((n) => n.close());

      await registration.showNotification(title, {
        ...options,
        actions: [
          { action: "open_ticket", title: "🟢 Abrir Ticket" },
          { action: "dismiss", title: "❌ Fechar" },
        ],
        data: { ticket: data.ticketId },
      });
    }

    function _showDirect(title, options, data) {
      const notification = new Notification(title, options);

      notification.onclick = _handleClick(data);
    }

    // ── Método principal ──────────────────────────────────────────────────

    async function show(data) {
      if (!_canShow()) return;

      const title = _getContactName(data);
      const options = _buildOptions(data);
      const hasSW = "serviceWorker" in navigator;

      try {
        if (hasSW) {
          try {
            await _showViaServiceWorker(title, options, data);
          } catch (_) {
            if (!isMobile()) {
              _showDirect(title, options, data);
            } else {
              console.warn(
                "[useNotifications] Bloqueado no mobile fora do SW.",
              );
            }
          }
        } else if (!isMobile()) {
          _showDirect(title, options, data);
        }
      } catch (err) {
        console.error("[useNotifications] Erro ao exibir notificação:", err);
      } finally {
        callbacks.value.playNotificationSound?.();
      }
    }

    // Alias legado
    function handleNotifications(data) {
      show(data);
    }
    function handlePlaySound() {
      callbacks.value.playNotificationSound?.();
    }

    return {
      permission: readonly(permission),
      requestPermission,
      setCallbacks,
      show,
      handleNotifications,
      handlePlaySound,
    };
  }

  // Expõe globalmente — acessível como window.useNotifications(...)
  global.useNotifications = useNotifications;
})(window);
