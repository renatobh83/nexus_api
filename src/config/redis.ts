import { Redis } from "ioredis";
import { redisConnection } from "./redisConnection.js";

export { redisConnection } from "./redisConnection.js";

export const redis = new Redis(redisConnection);

redis.on("error", (err: any) => {
  console.error("[Redis] Erro de conexão:", err);
});

redis.on("connect", () => {
  console.log("[Redis] Conectado com sucesso");
});
