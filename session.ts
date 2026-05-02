import { TelegramClient } from "teleproto";
import { StringSession } from "teleproto/sessions/StringSession.js";
import input from "input"; // Usar 'input' para uma interação mais robusta

// Substitua pelos seus valores
const apiId = 37071633; // Preencha com seu API ID
const apiHash = "6419c1f3fa3eedf28893611f8d0720d3"; // Preencha com seu API Hash
const session = new StringSession(""); // Deixe vazio para a primeira execução, ou preencha com a sessão salva

async function main() {
  const client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.connect();

  const phone = "5531985683733"; // Seu número de telefone

  console.log("➡️ Iniciando sessão...");

  try {
    await client.start({
      phoneNumber: phone,
      password: async () => {
        try {
          return await input.text("🔐 Senha 2FA: ");
        } catch (e) {
          console.error("Erro ao ler a senha 2FA:", e);
          throw e;
        }
      },
      phoneCode: async () => {
        try {
          return await input.text("📲 Código do Telegram: ");
        } catch (e) {
          console.error("Erro ao ler o código:", e);
          throw e;
        }
      },
      onError: (err) => console.log("⚠️ Erro durante o login:", err.message),
    });

    console.log("✅ Logado com sucesso!");

  } catch (err) {
    console.error("Erro na autenticação principal:", err.message);
    await client.disconnect();
    return;
  }

  const me = await client.getMe();
  console.log("👤 Conectado como:", me?.username || "desconhecido");

  console.log("🔑 Sessão:");
  const sessionString = client.session.save();
  console.log(sessionString);

  await client.sendMessage("me", {
    message: "🚀 Funcionando!",
  });

  await client.disconnect();
}

main().catch(error => console.error("Erro na execução principal:", error));
