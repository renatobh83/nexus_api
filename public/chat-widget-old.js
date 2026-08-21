(function () {
  if (window.__chatWidgetLoaded) return;
  window.__chatWidgetLoaded = true;

  // ─── Injeta estilos globais no <head> ────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById("chat-widget-styles")) return;
    const style = document.createElement("style");
    style.id = "chat-widget-styles";
    style.textContent = `
      .chat-message {
        display: flex;
        margin: 8px 0;
        max-width: 80%;
      }
      .chat-client {
        justify-content: flex-end;
        margin-left: auto;
        text-align: right;
      }
      .chat-agent {
        justify-content: flex-start;
        margin-right: auto;
        text-align: left;
      }
      .message-wrapper {
        max-width: 75%;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
      }
      .chat-client .message-wrapper {
        align-items: flex-end;
      }
      .message-sender {
        font-weight: bold;
        margin-right: 6px;
      }
      .message-meta {
        font-size: 11px;
        color: #777;
        margin-bottom: 4px;
      }
      .message-time {
        color: #999;
      }
      .message-content {
        background-color: #f0f0f0;
        padding: 10px 14px;
        border-radius: 12px;
        font-size: 14px;
        color: #333;
        word-break: break-word;
      }
      .chat-client .message-content {
        background-color: #d1e7ff;
        color: #000;
      }
      #toast-container {
        position: fixed;
        top: 100px;
        right: 20px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        z-index: 10000;
      }
    `;
    document.head.appendChild(style);
  }

  const loadScript = (src, callback) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = callback;
    document.head.appendChild(script);
  };

  loadScript("https://cdn.socket.io/4.7.2/socket.io.min.js", () => {
    injectStyles();

    const API_URL = "https://nexus.devrenato.com.br";
    const URL_SOCKET = "https://nexus.devrenato.com.br/chat-web";

    let socket;
    let chatVisible = false;
    let chatToken = localStorage.getItem("chat_token");
    let formContainer = null;
    let chatMessages = null;
    let loadingOlder = false;
    let offset = 0;
    let sendCooldown = false;

    // ─── Botão flutuante ─────────────────────────────────────────────────────────
    const chatButton = document.createElement("div");
    chatButton.innerText = "💬";
    chatButton.setAttribute("aria-label", "Abrir chat");
    chatButton.setAttribute("role", "button");
    chatButton.setAttribute("tabindex", "0");
    Object.assign(chatButton.style, {
      position: "fixed",
      bottom: "2rem",
      right: "2rem",
      background: "#007bff",
      color: "#fff",
      borderRadius: "50%",
      width: "3.5rem",
      height: "3.5rem",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      fontSize: "1.5rem",
      cursor: "pointer",
      zIndex: 9999,
      boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
      userSelect: "none",
    });
    document.body.appendChild(chatButton);

    chatButton.addEventListener("click", () => {
      chatVisible = !chatVisible;
      if (chatVisible) {
        if (!formContainer) showPreForm();
        else formContainer.style.display = "block";
      } else {
        if (formContainer) formContainer.style.display = "none";
      }
    });

    // Se já tem token salvo, reconecta automaticamente
    if (chatToken) {
      chatVisible = true;
      connectSocket();
    }

    // ─── Formulário pré-chat ──────────────────────────────────────────────────────
    function showPreForm() {
      formContainer = document.createElement("div");
      formContainer.innerHTML = `
        <div style="position:fixed;bottom:6rem;right:2rem;background:#fff;border-radius:12px;
                    padding:20px;box-shadow:0 4px 10px rgba(0,0,0,0.15);width:320px;
                    font-family:sans-serif;z-index:9992;">
          <h3 style="margin-top:0;font-size:1.2rem;color:#333;">Iniciar Atendimento</h3>

          <label style="display:block;margin-bottom:6px;color:#555;">Nome</label>
          <input id="chat-name" placeholder="Digite seu nome"
            style="width:100%;padding:10px;margin-bottom:15px;border:1px solid #ccc;
                   border-radius:8px;box-sizing:border-box;" />

          <label style="display:block;margin-bottom:6px;color:#555;">E-mail</label>
          <input type="email" id="chat-email" placeholder="Digite seu e-mail"
            style="width:100%;padding:10px;margin-bottom:15px;border:1px solid #ccc;
                   border-radius:8px;box-sizing:border-box;" />

          <label style="display:block;margin-bottom:6px;color:#555;">CNPJ</label>
          <input id="chat-cnpj" type="text" inputmode="numeric" placeholder="Digite seu CNPJ"
            maxlength="18"
            style="width:100%;padding:10px;margin-bottom:20px;border:1px solid #ccc;
                   border-radius:8px;box-sizing:border-box;" />

          <button id="chat-start-btn"
            style="width:100%;padding:12px;background:#007bff;color:#fff;border:none;
                   border-radius:8px;font-size:16px;cursor:pointer;">
            Iniciar Chat
          </button>
        </div>
      `;
      document.body.appendChild(formContainer);

      // Máscara simples de CNPJ
      document.getElementById("chat-cnpj").addEventListener("input", (e) => {
        let v = e.target.value.replace(/\D/g, "").slice(0, 14);
        if (v.length > 12)
          v = v.replace(
            /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2}).*/,
            "$1.$2.$3/$4-$5",
          );
        else if (v.length > 8)
          v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4}).*/, "$1.$2.$3/$4");
        else if (v.length > 5)
          v = v.replace(/^(\d{2})(\d{3})(\d{0,3}).*/, "$1.$2.$3");
        else if (v.length > 2) v = v.replace(/^(\d{2})(\d{0,3}).*/, "$1.$2");
        e.target.value = v;
      });

      document
        .getElementById("chat-start-btn")
        .addEventListener("click", async () => {
          const name = document.getElementById("chat-name").value.trim();
          const email = document.getElementById("chat-email").value.trim();
          const identifier = document
            .getElementById("chat-cnpj")
            .value.replace(/\D/g, "");

          if (!name || !email || !identifier) {
            showToast("Preencha todos os campos.", "error");
            return;
          }
          if (!validateEmail(email)) {
            showToast("Digite um e-mail válido.", "error");
            return;
          }
          if (identifier.length !== 14) {
            showToast("CNPJ inválido.", "error");
            return;
          }

          const startBtn = document.getElementById("chat-start-btn");
          startBtn.textContent = "Iniciando...";
          startBtn.disabled = true;

          try {
            const res = await fetch(`${API_URL}/api/v1/chatClient/token`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name, email, identifier }),
            });
            const { token, error } = await res.json();

            if (error) {
              showToast(error, "error");
              startBtn.textContent = "Iniciar Chat";
              startBtn.disabled = false;
              return;
            }

            showToast(
              "Aguarde um técnico para iniciar o atendimento.",
              "success",
            );
            chatToken = token;
            localStorage.setItem("chat_token", token);
            formContainer.remove();
            formContainer = null;
            connectSocket();
          } catch (err) {
            console.error("Erro ao gerar token", err);
            showToast("Não foi possível iniciar o chat.", "error");
            startBtn.textContent = "Iniciar Chat";
            startBtn.disabled = false;
          }
        });
    }

    // ─── Socket ───────────────────────────────────────────────────────────────────
    function connectSocket() {
      if (formContainer) {
        formContainer.remove();
        formContainer = null;
      }

      socket = io(URL_SOCKET, {
        auth: { token: chatToken },
        transports: ["websocket"],
      });

      socket.on("connect", () => {
        console.log("Conectado ao socket", socket.id);
        openChatUI();
      });

      socket.on("chat:ready", (msg) => {
        console.log("Chat pronto, carregando mensagens...");
        appendMessage("Bot", msg, Date.now());
      });

      socket.on("chat:reply", (msg) => {
        if (loadingOlder) hideLoading();
        const nome = extrairNome(msg);
        const mensagemSemNome = msg.replace(/\*(.*?)\*:\s*/, "");
        appendMessage(nome, mensagemSemNome, Date.now());
        playSound();
        try {
          notify("Nova mensagem", mensagemSemNome);
        } catch (e) {
          /* sem permissão */
        }
      });

      socket.on("chat:image", (data) => {
        appendImage(data.url, Date.now(), true);
      });

      socket.on("chat:previousMessages", (messages) => {
        if (offset === 0) chatMessages.innerHTML = "";

        const scrollBefore = chatMessages.scrollHeight;

        messages.forEach((msg) => {
          const timestamp = msg.timestamp || Date.now();
          let el;

          if (msg.mediaType === "image") {
            const link = `${API_URL}/public/${msg.mediaUrl}`;
            el = createImageElement(link, timestamp, msg.fromMe, msg.id);
          } else {
            if (msg.fromMe) {
              const nome = extrairNome(msg.body);
              const mensagemSemNome = msg.body.replace(/\*(.*?)\*:\s*/, "");
              el = createMessageElement(
                nome,
                mensagemSemNome,
                timestamp,
                msg.id,
              );
            } else {
              el = createMessageElement("Você", msg.body, timestamp, msg.id);
            }
          }
          chatMessages.insertBefore(el, chatMessages.firstChild);
        });

        chatMessages.scrollTo({
          top: chatMessages.scrollHeight - scrollBefore,
          behavior: "smooth",
        });

        loadingOlder = false;
      });

      socket.on("chat:closedTicket", (msg) => {
        showToast(msg, "success");
        socket.disconnect();
        localStorage.removeItem("chat_token");
        if (formContainer) {
          formContainer.remove();
          formContainer = null;
        }
        offset = 0;
        chatToken = null;
        chatVisible = false;
        chatMessages = null;
      });

      socket.on("connect_error", (err) => {
        console.error("Erro de conexão:", err.message);
        if (err.message.includes("invalid token")) {
          showToast("Sessão expirada. Recarregue e inicie novamente.", "error");
          localStorage.removeItem("chat_token");
          chatToken = null;
        }
      });
    }

    // ─── UI do chat ───────────────────────────────────────────────────────────────
    function openChatUI() {
      // Evita abrir duas vezes se reconectar
      if (document.getElementById("chat-ui-container")) return;

      formContainer = document.createElement("div");
      formContainer.id = "chat-ui-container";
      formContainer.innerHTML = `
        <div style="position:fixed;bottom:6rem;right:2rem;background:white;border:1px solid #ccc;
                    border-radius:12px;box-shadow:0 4px 10px rgba(0,0,0,0.15);width:320px;
                    padding:12px;height:400px;display:flex;flex-direction:column;z-index:9999;
                    font-family:sans-serif;">

          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <small style="color:#999;">Conectado ao atendimento</small>
            <button id="chat-close-btn"
              style="background:transparent;border:none;font-size:16px;cursor:pointer;"
              aria-label="Encerrar atendimento">✖</button>
          </div>

          <div id="chat-messages" style="flex:1;padding:10px;overflow-y:auto;">
            <div id="chat-loading" style="text-align:center;color:#777;">Carregando mensagens...</div>
          </div>

          <div style="display:flex;align-items:center;gap:8px;position:relative;margin-top:8px;">
            <label for="file-upload"
              style="position:absolute;left:10px;cursor:pointer;font-size:18px;"
              aria-label="Anexar imagem">📎</label>
            <input type="file" id="file-upload" accept="image/*" style="display:none;" />
            <input id="chat-input" placeholder="Digite sua mensagem"
              style="flex:1;padding:8px 8px 8px 36px;border:1px solid #ccc;
                     border-radius:8px;font-size:14px;" />
            <button id="chat-send-btn"
              style="padding:8px 10px;background:#007bff;color:white;border:none;
                     border-radius:6px;cursor:pointer;" aria-label="Enviar">➤</button>
          </div>
        </div>
      `;
      document.body.appendChild(formContainer);

      chatMessages = document.getElementById("chat-messages");
      const chatInput = document.getElementById("chat-input");

      chatInput.addEventListener("paste", handlePaste);
      chatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey && e.target.value.trim()) {
          e.preventDefault();
          sendMessage();
        }
      });

      document
        .getElementById("chat-send-btn")
        .addEventListener("click", sendMessage);
      document
        .getElementById("file-upload")
        .addEventListener("change", handleFileInputChange);

      document
        .getElementById("chat-close-btn")
        .addEventListener("click", () => {
          if (!confirm("Deseja encerrar o atendimento?")) return;
          socket.emit("ChatWebFechado", {
            msg: "Cliente Finalizou o atendimento!",
            socket: socket.id,
          });
          socket.disconnect();
          localStorage.removeItem("chat_token");
          formContainer.remove();
          formContainer = null;
          chatMessages = null;
          offset = 0;
          chatToken = null;
          chatVisible = false;
        });

      chatMessages.addEventListener("scroll", () => {
        if (chatMessages.scrollTop === 0 && !loadingOlder) {
          loadMessages();
        }
      });
    }

    // ─── Mensagens ────────────────────────────────────────────────────────────────
    function sendMessage() {
      const input = document.getElementById("chat-input");
      if (!input) return;
      const msg = input.value.trim();
      if (sendCooldown || !msg) return;

      sendCooldown = true;
      setTimeout(() => (sendCooldown = false), 300);

      socket.emit("chat:message", { msg });
      appendMessage("Você", msg, Date.now());
      input.value = "";
    }

    function appendMessage(
      sender,
      text,
      timestamp = Date.now(),
      id = Date.now(),
    ) {
      if (!chatMessages) return;
      const el = createMessageElement(sender, text, timestamp, id);
      chatMessages.appendChild(el);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function createMessageElement(
      sender,
      text,
      timestamp = Date.now(),
      id = Date.now(),
    ) {
      const isClient = sender === "Você";
      const el = document.createElement("div");
      el.className = `chat-message ${isClient ? "chat-client" : "chat-agent"}`;

      const wrapper = document.createElement("div");
      wrapper.className = "message-wrapper";
      wrapper.id = String(id);

      const meta = document.createElement("div");
      meta.className = "message-meta";

      const senderSpan = document.createElement("span");
      senderSpan.className = "message-sender";
      senderSpan.textContent = sender;

      const timeSpan = document.createElement("span");
      timeSpan.className = "message-time";
      timeSpan.textContent = formatTime(timestamp);

      meta.appendChild(senderSpan);
      meta.appendChild(timeSpan);

      const content = document.createElement("div");
      content.className = "message-content";
      // Permite quebra de linha mas escapa HTML (prevenção básica de XSS)
      content.textContent = text;

      wrapper.appendChild(meta);
      wrapper.appendChild(content);
      el.appendChild(wrapper);
      return el;
    }

    // ─── Imagens ──────────────────────────────────────────────────────────────────
    function appendImage(
      url,
      timestamp = Date.now(),
      fromMe = false,
      id = Date.now(),
    ) {
      if (!chatMessages) return;
      const el = createImageElement(url, timestamp, fromMe, id);
      chatMessages.appendChild(el);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function createImageElement(
      url,
      timestamp = Date.now(),
      fromMe = false,
      id = Date.now(),
    ) {
      const el = document.createElement("div");
      // fromMe = true → mensagem do atendente (agent); false → cliente enviou
      el.className = `chat-message ${fromMe ? "chat-agent" : "chat-client"}`;

      const content = document.createElement("div");
      content.className = "message-content";
      content.id = String(id);

      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      const img = document.createElement("img");
      img.src = url;
      img.crossOrigin = "anonymous";
      img.style.cssText =
        "max-width:100%;border-radius:8px;margin-top:8px;display:block;";
      img.alt = "Imagem enviada";
      img.onerror = () => {
        img.alt = "Imagem indisponível";
      };

      link.appendChild(img);

      const time = document.createElement("div");
      time.style.cssText = "font-size:11px;color:#777;margin-top:4px;";
      time.textContent = formatTime(timestamp);

      content.appendChild(link);
      content.appendChild(time);
      el.appendChild(content);
      return el;
    }

    // ─── Upload de arquivo ────────────────────────────────────────────────────────
    function handleFileInputChange(event) {
      const file = event.target.files[0];
      if (file) uploadFile(file);
      event.target.value = ""; // permite reenviar o mesmo arquivo
    }

    function handlePaste(event) {
      const items = event.clipboardData?.items || [];
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            uploadFile(file);
            break;
          }
        }
      }
    }

    async function uploadFile(file) {
      if (!file) return;
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch(`${API_URL}/api/v1/chatClient/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${chatToken}` },
          body: formData,
        });
        const data = await res.json();
        if (data.url) {
          socket.emit("chat:message", { msg: "image", mediaUrl: data.url });
          appendImage(data.url, Date.now(), "Você", false);
        } else {
          showToast("Erro ao enviar imagem.", "error");
        }
      } catch (err) {
        console.error("Erro no upload:", err);
        showToast("Erro ao enviar imagem.", "error");
      }
    }

    // ─── Carregamento de mensagens ────────────────────────────────────────────────
    function loadMessages() {
      loadingOlder = true;
      showLoading();
      // socket.emit("chat:getMessages", { offset });
      // offset += 50;
    }

    function showLoading() {
      const el = document.getElementById("chat-loading");
      if (el) el.style.display = "block";
    }

    function hideLoading() {
      const el = document.getElementById("chat-loading");
      if (el) el.style.display = "none";
    }

    // ─── Notificações ─────────────────────────────────────────────────────────────
    function notify(title, body) {
      if (!("Notification" in window)) return;
      if (Notification.permission === "granted") {
        new Notification(title, { body });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((perm) => {
          if (perm === "granted") new Notification(title, { body });
        });
      }
    }

    function playSound() {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      } catch (e) {
        /* contexto de áudio indisponível */
      }
    }

    // ─── Toast ────────────────────────────────────────────────────────────────────
    function showToast(message, type = "info") {
      let container = document.getElementById("toast-container");
      if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        document.body.appendChild(container);
      }

      const toast = document.createElement("div");
      const bg =
        type === "error" ? "#dc3545" : type === "success" ? "#28a745" : "#333";
      Object.assign(toast.style, {
        padding: "12px 16px",
        background: bg,
        color: "white",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        fontSize: "14px",
        opacity: "0",
        transform: "translateY(20px)",
        transition: "opacity 0.3s ease, transform 0.3s ease",
        maxWidth: "280px",
        wordBreak: "break-word",
      });
      toast.textContent = message;
      container.appendChild(toast);

      requestAnimationFrame(() => {
        toast.style.opacity = "1";
        toast.style.transform = "translateY(0)";
      });

      setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(20px)";
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }

    // ─── Utilitários ──────────────────────────────────────────────────────────────
    function validateEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function extrairNome(mensagem) {
      const match = mensagem.match(/\*(.*?)\*/);
      return match ? match[1] : "Atendente";
    }

    function formatTime(timestamp) {
      const date = new Date(Number(timestamp));
      return date.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  });
})();
