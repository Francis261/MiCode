import path from "node:path";
import { fileURLToPath } from "node:url";

// Load remote-server/.env (or MICODE_ENV_FILE) before any other module reads process.env.
// Variables already set in the real environment always win.
const here = path.dirname(fileURLToPath(import.meta.url));
const envFile = process.env.MICODE_ENV_FILE || path.join(here, "..", ".env");
try {
  process.loadEnvFile(envFile);
} catch (e) {
  if (e.code !== "ENOENT") console.error("[env] could not load env file:", e.message);
}
