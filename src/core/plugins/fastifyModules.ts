import fp from "fastify-plugin";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import formbody from "@fastify/formbody";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import path from "node:path";
import xss from "xss";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
const isDevelopment = process.env.NODE_ENV !== "production";
/**
 * @file Módulo de Segurança e Middlewares Essenciais para Fastify
 * @module plugins/fastifyModules
 *
 * @description
 * Este plugin encapsula um conjunto abrangente de middlewares e configurações de segurança
 * para robustecer a aplicação Fastify. Ele é projetado para ser um ponto central de
 * configuração para proteção contra vulnerabilidades web comuns e para habilitar
 * funcionalidades essenciais de uma API moderna.
 *
 * As funcionalidades incluem:
 * 1.  **Segurança de Cabeçalhos HTTP** com Helmet e uma política de segurança de conteúdo (CSP) estrita.
 * 2.  **Controle de Acesso Cross-Origin (CORS)** com uma lista de permissões dinâmica.
 * 3.  **Servidor de Arquivos Estáticos** para a pasta 'public'.
 * 4.  **Limitação de Requisições (Rate Limiting)** para prevenção de ataques de força bruta e DoS.
 * 5.  **Parsing de Cookies** seguros e assinados.
 * 6.  **Parsing de Corpo de Requisição** para `form-data`, `multipart` e compressão de resposta.
 * 7.  **Proteção contra Poluição de Parâmetros HTTP (HPP)**.
 * 8.  **Proteção contra Cross-Site Request Forgery (CSRF)** com tokens rotativos.
 * 9.  **Sanitização de Entradas (XSS)** para `body`, `query` e `params`.
 * 10. **Logging Detalhado** do ciclo de vida de cada requisição.
 *
 * @see https://github.com/fastify/fastify-helmet
 * @see https://github.com/fastify/fastify-cors
 * @see https://github.com/fastify/fastify-rate-limit
 */
const fastifyModule = fp(async (fastify: FastifyInstance) => {
  fastify.log.info(
    "🔐 Registrando módulo de segurança e middlewares essenciais...",
  );

  // --- 1. Segurança de Cabeçalhos (Helmet & CSP) ---
  // Define cabeçalhos HTTP seguros para mitigar ataques como Clickjacking e XSS.
  // A Política de Segurança de Conteúdo (CSP) restringe de onde os recursos podem ser carregados.
  await fastify.register(helmet, {
    contentSecurityPolicy:
      process.env.NODE_ENV === "production"
        ? {
            /* Configurações de produção estritas */
          }
        : false, // Desativa CSP em desenvolvimento para facilitar o uso de hot-reloading e outras ferramentas.
    // ... outras configurações do helmet
    xPoweredBy: false, // Sempre desativar para não expor a tecnologia do servidor.
  });
  const allowedOrigins = [
    "http://127.0.0.1:5500", // Live Server
    "http://localhost:5500", // Live Server alternativo
    "http://127.0.0.1:3000", // Seu frontend local
    "http://localhost:3000",
    // Adicione outras origens necessárias
  ];

  await fastify.register(cors, {
    origin: (origin, cb) => {
      console.log("📍 Origem recebida:", origin);
      console.log("📋 Allowed origins:", allowedOrigins);

      if (!origin || allowedOrigins.includes(origin)) {
        console.log("✅ CORS permitido");
        return cb(null, true);
      }

      console.log("❌ CORS bloqueado");
      return cb(new Error(`Not allowed by CORS: ${origin}`), false);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-csrf-token",
      "api-key",
    ],
    credentials: true,
  });
  // --- 3. Servidor de Arquivos Estáticos ---
  await fastify.register(fastifyStatic, {
    root: path.join(__dirname, "..", "..", "..", "public"),
    prefix: "/public/",
  });

  // --- 4. Limitação de Requisições (Rate Limiting) ---
  // Protege a API contra ataques de força bruta e abuso, limitando o número de requisições por IP.
  await fastify.register(rateLimit, {
    max: 100, // Máximo de 100 requisições
    timeWindow: "1 minute", // por minuto
    // redis: fastify.redis, // Usa o Redis para um rate limit distribuído e persistente.
    // ...
  });

  // --- 5. Parsing de Cookies, Formulários e Compressão ---
  await fastify.register(cookie, { secret: process.env.COOKIE_SECRET });
  await fastify.register(formbody);
  await fastify.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } }); // Limite de 10MB para uploads

  // --- 6. Proteção contra Poluição de Parâmetros HTTP (HPP) ---
  // Previne que um atacante sobrescreva parâmetros enviando múltiplos valores para o mesmo parâmetro de query.
  fastify.addHook(
    "preValidation",
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (request.query) {
        for (const key in request.query as Record<string, unknown>) {
          if (Array.isArray((request.query as Record<string, unknown>)[key])) {
            return reply
              .code(400)
              .send({ error: "Detecção de Poluição de Parâmetro HTTP (HPP)." });
          }
        }
      }
    },
  );

  // --- 7. Proteção contra Cross-Site Request Forgery (CSRF) ---
  // Garante que as requisições que modificam o estado sejam originadas da nossa própria aplicação.
  // await fastify.register(csrf, {
  //   cookieOpts: {
  //     // Adicione esta linha 👇
  //     domain: isDevelopment ? undefined : ".panelapps.site",
  //     httpOnly: false,
  //     secure: !isDevelopment,
  //     sameSite: isDevelopment ? "lax" : "none",
  //     path: "/",
  //   },
  // });

  // fastify.addHook(
  //   "onRequest",
  //   async (request: FastifyRequest, reply: FastifyReply) => {
  //     const protectedMethods = ["POST", "PUT", "PATCH", "DELETE"];

  //     // 🔹 Só métodos mutáveis
  //     if (!protectedMethods.includes(request.method)) {
  //       return;
  //     }

  //     // 🔹 Rotas que NÃO exigem CSRF
  //     const csrfIgnoreRoutes = [
  //       "/api/v1/auth/login",
  //       "/api/v1/auth/refresh_token",
  //       "/api/v1/auth/logout",
  //       "/api/v1/auth/forgot-password",
  //       "/api/v1/chatClient/token",
  //       "/api/v1/chatClient/upload",
  //       "/api/v1/validate-registration-token",
  //       "/api/v1/complete-registration",
  //       "/api/v1/register",
  //     ];
  //     const externalApiBaseRoute = "/api/v1/external";
  //     const requestedUrl = request.routeOptions.url ?? "";

  //     if (
  //       requestedUrl.startsWith(externalApiBaseRoute) ||
  //       csrfIgnoreRoutes.includes(requestedUrl)
  //     ) {
  //       console.log("Rota ignorada para verificação de CSRF.");
  //       return; // Ignora a verificação
  //     }
  //     const csrfCookie = request.cookies._csrf;
  //     const csrfHeader = request.headers["x-csrf-token"];

  //     if (!csrfCookie || !csrfHeader) {
  //       return reply.status(403).send({ message: "CSRF token missing" });
  //     }
  //   },
  // );
  // --- 8. Sanitização de Entradas contra Cross-Site Scripting (XSS) ---
  // Limpa todas as entradas do usuário (body, query, params) para remover scripts maliciosos.
  const sanitize = (value: unknown): unknown => {
    if (typeof value === "string") return xss(value);
    if (Array.isArray(value)) return value.map(sanitize);
    if (value !== null && typeof value === "object") {
      const sanitizedObject: { [key: string]: unknown } = {};
      for (const key in value as Record<string, unknown>) {
        sanitizedObject[key] = sanitize(
          (value as Record<string, unknown>)[key],
        );
      }
      return sanitizedObject;
    }
    return value;
  };
  fastify.addHook("preValidation", async (request: FastifyRequest) => {
    request.body = sanitize(request.body);
    request.query = sanitize(request.query);
    request.params = sanitize(request.params);
  });

  fastify.log.info(
    "✅ Módulo de segurança e middlewares essenciais carregado com sucesso!",
  );
});

export default fastifyModule;
