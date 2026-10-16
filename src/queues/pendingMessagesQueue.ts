import { Queue } from "bullmq";
import { redisConnection } from "../config/redis.js";

export const pendingMessagesQueue = new Queue("process-messages-queue", {
  connection: redisConnection,
});
