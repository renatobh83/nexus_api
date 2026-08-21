import type { RedisOptions } from "ioredis";

/**
 * Opções compartilhadas do Redis sem criar uma conexão durante a importação.
 * A conexão global continua sendo responsabilidade exclusiva de `redis.ts`.
 */
export const redisConnection: RedisOptions = {
  host: process.env.IO_REDIS_SERVER ?? "localhost",
  port: Number(process.env.IO_REDIS_PORT ?? 6379),
  password: process.env.IO_REDIS_PASSWORD,
  db: Number(process.env.IO_REDIS_DB_SESSION ?? 8),
};
