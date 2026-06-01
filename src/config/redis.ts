// config/redis.ts
import { ConnectionOptions } from "bullmq";
console.log(process.env.IO_REDIS_SERVER);
export const redisConnection: ConnectionOptions = {
  host: process.env.IO_REDIS_SERVER ?? "localhost",
  port: Number(process.env.IO_REDIS_PORT ?? 6379),
  password: process.env.IO_REDIS_PASSWORD,
  db: Number(process.env.IO_REDIS_DB_SESSION ?? 8),
};
