import readline from 'node:readline/promises';

import { TelegramClient } from "teleproto";
import { StringSession } from "teleproto/sessions/StringSession.js";



const apiId   = 37071633;
const apiHash = "6419c1f3fa3eedf28893611f8d0720d3";
// sessão vazia (primeiro login)
const session = new StringSession("");




function normalizePhone(phone: string) {
  return phone.replace(/\D/g, ""); // remove tudo que não for número
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (q: string) =>
  new Promise<string>((resolve) => rl.question(q, resolve));



async function main() {
  const client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.connect();

  const phone = "5531985683733";

  console.log("📡 Enviando código...");
  const result = await client.sendCode(
    { apiId, apiHash },
    phone
  );

  console.log("📨 Código enviado!");

  const code = await ask("📲 Code from Telegram: ");

  try {
    console.log("➡️ Fazendo login...");

    await client.signIn({
      phoneNumber: phone,
      phoneCode: code.trim(),
      phoneCodeHash: result.phoneCodeHash,
    });

    console.log("✅ Logado com sucesso!");

  } catch (err: any) {
    console.log("⚠️ Erro:", err.message);

    // 👇 aqui estava faltando no seu fluxo
    if (err.errorMessage === "SESSION_PASSWORD_NEEDED") {
      const password = await ask("🔐 2FA password: ");

      await client.signInWithPassword({
        password,
      });

      console.log("✅ Logado com 2FA!");
    } else {
      throw err;
    }
  }

  const me = await client.getMe();
  console.log("👤 Connected as:", me?.username || "unknown");

  console.log("🔑 Session:");
  console.log(client.session.save());

  await client.sendMessage("me", {
    message: "🚀 Funcionando!",
  });

  await client.disconnect();
  rl.close();
}


main().catch(error=>console.log(error))