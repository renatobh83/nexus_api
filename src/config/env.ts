import { join } from "node:path";

export const PUBLIC_DIR =
  process.env.PUBLIC_DIR ?? join(process.cwd(), "public");
