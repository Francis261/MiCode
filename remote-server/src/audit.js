import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Append-only audit log (JSON lines) with secret redaction.
 * Every MCP tool call is recorded: who, what, when, how long, and whether it failed.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = path.resolve(process.env.MICODE_DATA_DIR || path.join(here, "..", "data"));
try { fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 }); } catch (e) { console.error("[audit] cannot create data dir:", e.message); }

const FILE = path.join(DATA_DIR, "audit.jsonl");
const MAX_BYTES = 5 * 1024 * 1024; // rotate to audit.jsonl.1

const SECRET_KEY = /(token|secret|passw(or)?d|authorization|api[_-]?key|cookie|credential)/i;
const BLOB_KEYS = new Set(["content", "patch", "diff", "new_text", "old_text", "file_text"]);
const TOKEN_PATTERNS = [
  /github_pat_[A-Za-z0-9_]{20,}/g,
  /\bgh[pousr]_[A-Za-z0-9]{20,}/g,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}/gi,
  /\beyJ[A-Za-z0-9_-]{16,}(?:\.[A-Za-z0-9_-]{6,}){0,2}/g,
  /\bsk-[A-Za-z0-9_-]{20,}/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g,
];

export function redactString(s) {
  let out = String(s);
  for (const re of TOKEN_PATTERNS) out = out.replace(re, "[REDACTED]");
  out = out.replace(/\b([A-Za-z0-9_]*(?:TOKEN|SECRET|PASSWORD|PASSWD|API_?KEY)[A-Za-z0-9_]*)=("[^"]*"|'[^']*'|\S+)/g, "$1=[REDACTED]");
  out = out.replace(/(--?(?:token|password|passwd|secret)[= ])\S+/gi, "$1[REDACTED]");
  return out;
}

export function redact(value, depth = 0) {
  if (typeof value === "string") {
    const s = redactString(value);
    return s.length > 600 ? `${s.slice(0, 600)}…(+${s.length - 600} chars)` : s;
  }
  if (Array.isArray(value)) return value.slice(0, 30).map((v) => redact(v, depth + 1));
  if (value && typeof value === "object") {
    if (depth > 3) return "[object]";
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (SECRET_KEY.test(k)) out[k] = "[REDACTED]";
      else if (k === "env" && v && typeof v === "object") out[k] = `[keys: ${Object.keys(v).join(", ")}]`;
      else if (BLOB_KEYS.has(k) && typeof v === "string") out[k] = `[${v.length} chars]`;
      else out[k] = redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

export function audit(entry) {
  try {
    const line = JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n";
    try { if (fs.statSync(FILE).size > MAX_BYTES) fs.renameSync(FILE, `${FILE}.1`); } catch { /* no file yet */ }
    fs.appendFileSync(FILE, line, { mode: 0o600 });
  } catch (e) {
    console.error("[audit] write failed:", e.message);
  }
}

export function readAudit({ limit = 50, tool, errorsOnly = false, since } = {}) {
  const rows = [];
  for (const f of [`${FILE}.1`, FILE]) {
    let text = "";
    try { text = fs.readFileSync(f, "utf8"); } catch { continue; }
    for (const line of text.split("\n")) {
      if (!line) continue;
      try { rows.push(JSON.parse(line)); } catch { /* skip a torn line */ }
    }
  }
  return rows
    .filter((r) => (!tool || r.tool === tool) && (!errorsOnly || r.ok === false) && (!since || r.ts >= since))
    .slice(-Math.min(Math.max(limit, 1), 500));
}

export function registerAuditTool(mcp, d) {
  const { z, textResult } = d;
  mcp.registerTool("audit_log", {
    description: "Show the most recent tool calls recorded by this server (who, what, when, ok/error, duration). Secrets are redacted.",
    inputSchema: { limit: z.number().int().min(1).max(200).optional(), tool: z.string().optional(), errors_only: z.boolean().optional(), since: z.string().optional() },
  }, async ({ limit = 30, tool, errors_only = false, since }) => textResult(readAudit({ limit, tool, errorsOnly: errors_only, since })));
}
