import "dotenv/config";
import { start } from "./api/index.js";
import "./workers/schedulingApi/scheduling_worker.js";
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};
start().catch((err) => {
  console.error("❌ Erro fatal ao iniciar o servidor:", err);
  process.exit(1);
});
