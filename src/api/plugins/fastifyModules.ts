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
import { AppConfig, loadAppConfig } from "../../config/appConfig.js";
import {
  getAllowedCorsOrigins,
  isAllowedCorsOrigin,
} from "../../config/cors.js";
import {
  MAX_MULTIPART_FILE_BYTES,
  MAX_MULTIPART_FILES,
} from "../../utils/readMultipart.js";
import { getContentSecurityPolicy } from "../../config/securityHeaders.js";

type FastifyModuleOptions = Readonly<{
  appConfig?: AppConfig;
}>;

const fastifyModule = fp(
  async (
    fastify: FastifyInstance,
    options: FastifyModuleOptions = {},
  ) => {
  const appConfig = options.appConfig ?? loadAppConfig();
  fastify.log.info(
    "🔐 Registrando módulo de segurança e middlewares essenciais...",
  );

  // --- 1. Segurança de Cabeçalhos (Helmet & CSP) ---
  await fastify.register(helmet, {
    contentSecurityPolicy: getContentSecurityPolicy(),
    xPoweredBy: false,
  });

  // --- 2. CORS configurado a partir do ambiente ---
  const allowedOrigins = getAllowedCorsOrigins();

  fastify.log.info(
    { allowedOrigins },
    "Origens CORS HTTP autorizadas",
  );

  await fastify.register(cors, {
    origin: (origin, cb) => {
      // Requisições sem Origin, como chamadas internas e health checks, não são
      // requisições cross-origin e não precisam de cabeçalho CORS.
      if (!origin) {
        return cb(null, true);
      }

      if (isAllowedCorsOrigin(origin)) {
        return cb(null, true);
      }

      return cb(new Error(`Not allowed by CORS: ${origin}`), false);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-csrf-token",
    ],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // --- 3. Servidor de Arquivos Estáticos ---
  await fastify.register(fastifyStatic, {
    root: path.resolve(PUBLIC_DIR),
    prefix: "/public",
    setHeaders(response) {
      // As mídias são recursos públicos do chat e precisam poder ser exibidas
      // tanto pela aplicação interna quanto pelo widget hospedado em outra
      // origem. A política global do Helmet continua restrita para os demais
      // recursos da API.
      response.raw.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      // O painel Vue usa outra origem e alguns elementos de mídia podem
      // solicitar leitura CORS. Como esses arquivos são públicos, não há
      // credencial de usuário envolvida nessa resposta.
      response.raw.setHeader("Access-Control-Allow-Origin", "*");
      response.raw.setHeader("Cache-Control", "public, max-age=3600");
    },
  });

  // --- 4. Limitação de Requisições ---
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  // --- 5. Parsing de Cookies, Formulários e Compressão ---
  await fastify.register(cookie, {
    secret: appConfig.cookieSecret,
  });

  await fastify.register(formbody);
  await fastify.register(multipart, {
    limits: {
      fileSize: MAX_MULTIPART_FILE_BYTES,
      files: MAX_MULTIPART_FILES,
      fields: 20,
      fieldSize: 1024 * 1024,
      parts: 30,
    },
  });

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
  },
);

export default fastifyModule;
