// Instalação — força ativação imediata
self.addEventListener("install", (event) => {
  console.log("Service Worker instalando...");
  self.skipWaiting();
});
// Ativação — assume controle de todas as abas
self.addEventListener("activate", (event) => {
  console.log("Service Worker ativado!");
  event.waitUntil(clients.claim());
});

// Exibe logs úteis para debug
self.addEventListener("push", (event) => {
  console.log("📨 Push recebido:", event.data?.text());
});

self.addEventListener("notificationclick", function (event) {
  const clickedNotification = event.notification;
  const action = event.action;

  // Fechar a notificação após o clique
  clickedNotification.close();
  if (action === "dismiss") {
    console.log("❌ Notificação dispensada.");
    return;
  }
  if (action === "open_ticket" || !action) {
    const ticketData = clickedNotification.data?.ticket;
    const urlToOpen = `/atendimento/${ticketData.id}`; // Ajuste para a URL correta do seu ticket

    event.waitUntil(
      (async () => {
        const allClients = await clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });

        // Tenta enviar mensagem para uma aba já aberta
        for (const client of allClients) {
          if (
            client.url.includes("http://localhost:5173") ||
            client.url.includes("http://localhost:54884/") ||
            client.url.includes("https://test.panelapps.site")
          ) {
            client.postMessage({
              type: "NOTIFICATION_CLICK",
              payload: { ticket: ticketData },
            });
            client.focus();
            return;
          }
        }

        // Se nenhuma aba correspondente estiver aberta, abre uma nova
        console.log("🌐 Nenhuma aba ativa — abrindo nova janela:", urlToOpen);
        await clients.openWindow(urlToOpen);
      })(),
    );
  }
});
