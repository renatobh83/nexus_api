import { RedisOptions } from "ioredis";
import { Redis } from "ioredis";

export const redisConnection: RedisOptions = {
  host: process.env.IO_REDIS_SERVER ?? "localhost",
  port: Number(process.env.IO_REDIS_PORT ?? 6379),
  password: process.env.IO_REDIS_PASSWORD,
  db: Number(process.env.IO_REDIS_DB_SESSION ?? 8),
};


export const redis = new Redis(redisConnection);

redis.on("error", (err: any) => {
  console.error("[Redis] Erro de conexão:", err);
});

redis.on("connect", () => {
  console.log("[Redis] Conectado com sucesso");
});