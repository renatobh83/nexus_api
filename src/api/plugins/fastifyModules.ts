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
import { PUBLIC_DIR } from "../../config/env.js";

const fastifyModule = fp(async (fastify: FastifyInstance) => {
  fastify.log.info(
    "🔐 Registrando módulo de segurança e middlewares essenciais...",
  );

  // --- 1. Segurança de Cabeçalhos (Helmet & CSP) ---
  await fastify.register(helmet, {
    contentSecurityPolicy:
      process.env.NODE_ENV === "production"
        ? {
            directives: {
              defaultSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
              imgSrc: ["'self'", "data:", "https:"],
            },
          }
        : false,
    xPoweredBy: false,
  });

  // --- 2. CORS Configurado corretamente ---
  const allowedOrigins = [
    "http://127.0.0.1:3000",
    "http://localhost:51333",
    "https://atendimento.devrenato.com.br",
    "https://nexus.devrenato.com.br",
    "https://renatobh83.github.io",
    "undefined",
    "null",
  ];

  await fastify.register(cors, {
    origin: (origin, cb) => {
      // Importante: em desenvolvimento, origens null/undefined devem ser permitidas
      if (!origin || allowedOrigins.includes(origin)) {
        return cb(null, true);
      }
      return cb(new Error(`Not allowed by CORS: ${origin}`), false);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-csrf-token",
      "X-API-Key",
    ],
    exposedHeaders: ["X-API-Key"],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // --- 3. Servidor de Arquivos Estáticos ---
  await fastify.register(fastifyStatic, {
    root: path.join(PUBLIC_DIR),
    prefix: "/public",
  });

  // --- 4. Limitação de Requisições ---
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  // --- 5. Parsing de Cookies, Formulários e Compressão ---
  // CORREÇÃO: Verificar se o secret existe
  const cookieSecret = process.env.COOKIE_SECRET;
  if (!cookieSecret && process.env.NODE_ENV === "production") {
    fastify.log.warn("⚠️ COOKIE_SECRET não definido no ambiente de produção!");
  }

  await fastify.register(cookie, {
    secret: cookieSecret || "default-secret-key-for-development", // Fallback para dev
  });

  await fastify.register(formbody);
  await fastify.register(multipart, { limits: { fileSize: 60 * 1024 * 1024 } });

  // --- 6. Proteção contra Poluição de Parâmetros HTTP (HPP) ---

  // --- 7. Sanitização de Entradas contra XSS ---
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

  fastify.addHook(
    "preValidation",
    async (request: FastifyRequest, reply: FastifyReply) => {
      // HPP
      if (request.query) {
        for (const key in request.query as Record<string, unknown>) {
          if (Array.isArray((request.query as Record<string, unknown>)[key])) {
            return reply.code(400).send({ error: "HPP detectado." });
          }
        }
      }

      // XSS
      if (request.body) request.body = sanitize(request.body);
      if (request.query) request.query = sanitize(request.query);
      if (request.params) request.params = sanitize(request.params);
    },
  );

  // --- 8. Hook para log de respostas (debug) ---

  fastify.log.info("✅ Módulo de segurança carregado com sucesso!");
});

export default fastifyModule;
