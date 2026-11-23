import crypto from "node:crypto";
import { redact, redactString } from "./audit.js";

/**
 * Human-in-the-loop approvals for risky actions.
 *
 * MICODE_APPROVALS = risky (default) | all | off
 *   risky: commands matching the rules below (plus force-push, checkpoint restore, PR merge) wait for the owner
 *   all:   every command-running tool waits
 *   off:   never ask
 *
 * The owner approves at <MICODE_PUBLIC_URL>/admin (owner password). Optional phone alerts via
 * MICODE_NTFY_URL (e.g. https://ntfy.sh/<secret-topic>) and/or MICODE_TELEGRAM_BOT_TOKEN + MICODE_TELEGRAM_CHAT_ID.
 *
 * This is a guard rail against mistakes, not a sandbox: a determined caller can obfuscate a command.
 */
const env = process.env;
const MODE = ["off", "risky", "all"].includes((env.MICODE_APPROVALS || "").toLowerCase()) ? env.MICODE_APPROVALS.toLowerCase() : "risky";
const WAIT_MS = Math.max(0, Number(env.MICODE_APPROVAL_WAIT_SECS ?? 45)) * 1000;
const TTL_MS = 10 * 60_000;
const PUBLIC_URL = (env.MICODE_PUBLIC_URL || "").replace(/\/+$/, "");

const RULES = [
  [/\brm\s+(?:-[a-zA-Z]*[rRf][a-zA-Z]*\s|--recursive|--force)/, "recursive or forced delete"],
  [/\bgit\s+push\b[^\n;|&]*(?:--force\b|--force-with-lease|\s-f\b)/, "force push"],
  [/\bgit\s+(?:reset\s+--hard|clean\s+-[a-zA-Z]*f|branch\s+-D|checkout\s+--\s+\.|restore\s+\.)/, "destructive git command"],
  [/\b(?:mkfs(?:\.\w+)?|fdisk|parted|wipefs)\b/, "disk formatting"],
  [/\bdd\b[^\n;|&]*\bof=\/dev\//, "raw disk write"],
  [/>\s*\/dev\/(?:sd|nvme|vd)/, "raw disk write"],
  [/\b(?:shutdown|reboot|poweroff|halt)\b/, "power control"],
  [/\b(?:chmod|chown)\s+-R\b/, "recursive permission change"],
  [/\b(?:curl|wget)\b[^\n]*\|\s*(?:sudo\s+)?(?:ba|z)?sh\b/, "piping a download into a shell"],
  [/\bpm2\s+(?:delete|kill|flush|stop\s+all|jlist|prettylist|env|describe|show|info)\b/, "pm2 destructive or secret-revealing command"],
  [/\bdocker\s+(?:system|volume|image|container|network)\s+prune\b|\bdocker\s+rm\s+-f\b|\bdocker\s+compose\s+down\s+(?:-v|--volumes)/, "destructive docker command"],
  [/\b(?:drop\s+(?:database|table|schema)|truncate\s+table)\b/i, "destructive database command"],
  [/\b(?:killall|pkill\s+-9|kill\s+-9\s+-?1)\b/, "mass process kill"],
  [/\bsystemctl\s+(?:stop|disable|mask)\b/, "stopping a system service"],
  [/\b(?:npm|yarn|pnpm)\s+publish\b/, "publishing a package"],
  [/\bcrontab\s+-r\b/, "removing the crontab"],
  [/:\(\)\s*\{\s*:\|:&\s*\}/, "fork bomb"],
  [/\.ssh\/|\.git-credentials|\/etc\/(?:shadow|sudoers)\b|\bid_(?:rsa|ed25519|ecdsa)\b/, "touching credential files"],
];

function commandLine(tool, a) {
  if (tool === "run_shell" || tool === "process_start") return String(a.command || "");
  if (tool === "run_command") return [a.command, ...(Array.isArray(a.args) ? a.args : [])].join(" ");
  return "";
}

/** Returns a short reason when the call needs approval, else null. */
export function riskReason(tool, a = {}) {
  if (MODE === "off") return null;
  const isExec = tool === "run_command" || tool === "run_shell" || tool === "process_start";
  if (isExec) {
    const line = commandLine(tool, a);
    for (const [re, why] of RULES) if (re.test(line)) return why;
    for (const src of String(env.MICODE_RISKY_PATTERNS || "").split("||").map((s) => s.trim()).filter(Boolean)) {
      try { if (new RegExp(src, "i").test(line)) return "matches MICODE_RISKY_PATTERNS"; } catch { /* ignore bad regex */ }
    }
    if (MODE === "all") return "approval mode is 'all'";
    return null;
  }
  if (tool === "git_push" && a.force) return "force push";
  if (tool === "git_checkout" && a.path) return "overwrites working-tree files";
  if (tool === "checkpoint_restore" && !a.dry_run) return "restores a checkpoint (rewrites and deletes files)";
  if (tool === "github_prs" && a.action === "merge") return "merges a pull request";
  if (MODE === "all" && (tool === "git_push" || tool === "delete_file")) return "approval mode is 'all'";
  return null;
}

function stable(v) {
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  if (v && typeof v === "object") return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(",")}}`;
  return JSON.stringify(v);
}
const keyOf = (tool, a) => crypto.createHash("sha256").update(`${tool}\n${stable(a)}`).digest("hex");

const records = new Map(); // id -> record
function prune() {
  const t = Date.now();
  for (const [id, r] of records) if (t - r.createdAt > TTL_MS * 3 && r.status !== "pending") records.delete(id);
}
setInterval(prune, 60_000).unref();

function summarize(tool, a) {
  const line = commandLine(tool, a);
  return redactString(line || JSON.stringify(redact(a))).slice(0, 300);
}

async function notify(rec) {
  const text = `Approval needed (${rec.reason})\n${rec.tool}: ${rec.summary}`;
  const link = PUBLIC_URL ? `${PUBLIC_URL}/admin` : undefined;
  const jobs = [];
  if (env.MICODE_NTFY_URL) {
    jobs.push(fetch(env.MICODE_NTFY_URL, { method: "POST", body: text, headers: { Title: "MiCode approval", Priority: "high", Tags: "warning", ...(link ? { Click: link } : {}) }, signal: AbortSignal.timeout(8000) }));
  }
  if (env.MICODE_TELEGRAM_BOT_TOKEN && env.MICODE_TELEGRAM_CHAT_ID) {
    jobs.push(fetch(`https://api.telegram.org/bot${env.MICODE_TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST", headers: { "content-type": "application/json" }, signal: AbortSignal.timeout(8000),
      body: JSON.stringify({ chat_id: env.MICODE_TELEGRAM_CHAT_ID, text: `${text}${link ? `\n${link}` : ""}`, disable_web_page_preview: true }),
    }));
  }
  const results = await Promise.allSettled(jobs);
  for (const r of results) if (r.status === "rejected") console.error("[approvals] notification failed:", String(r.reason?.message || r.reason).replace(env.MICODE_TELEGRAM_BOT_TOKEN || "\0", "***"));
}

function waitFor(rec, ms) {
  if (rec.status !== "pending") return Promise.resolve(rec.status);
  return new Promise((resolve) => {
    const timer = setTimeout(() => { rec.waiters.delete(done); resolve("pending"); }, ms);
    const done = (status) => { clearTimeout(timer); resolve(status); };
    rec.waiters.add(done);
  });
}

/**
 * Called before every tool runs. Resolves to "approved" if an owner approval was consumed,
 * undefined if no approval was needed, and throws if the call must not proceed.
 */
export async function gate(tool, args, ctx = {}) {
  const reason = riskReason(tool, args);
  if (!reason) return undefined;
  const key = keyOf(tool, args);
  const now = Date.now();
  let rec = [...records.values()].find((r) => r.key === key && now - r.createdAt < TTL_MS && r.status !== "consumed");

  if (rec?.status === "approved") { rec.status = "consumed"; return "approved"; }
  if (rec?.status === "denied") throw new Error(`Denied by the owner (${rec.reason}). Do not retry this command; ask the user what to do instead.`);

  if (!rec) {
    rec = { id: crypto.randomBytes(4).toString("hex"), key, tool, reason, summary: summarize(tool, args), args: redact(args), subject: ctx.subject || "unknown", createdAt: now, status: "pending", waiters: new Set() };
    records.set(rec.id, rec);
    void notify(rec);
  }
  const outcome = await waitFor(rec, WAIT_MS);
  if (outcome === "approved") { rec.status = "consumed"; return "approved"; }
  if (outcome === "denied") throw new Error(`Denied by the owner (${rec.reason}). Do not retry this command; ask the user what to do instead.`);
  throw new Error(`Owner approval required (${rec.reason}). Request ${rec.id} is waiting at ${PUBLIC_URL ? `${PUBLIC_URL}/admin` : "/admin"}. Tell the user, then retry this exact call once they approve (valid for 10 minutes, single use).`);
}

export function decide(id, approve) {
  const rec = records.get(id);
  if (!rec || rec.status !== "pending") return false;
  rec.status = approve ? "approved" : "denied";
  rec.decidedAt = Date.now();
  for (const w of rec.waiters) w(rec.status);
  rec.waiters.clear();
  return true;
}

const view = (r) => ({ id: r.id, tool: r.tool, reason: r.reason, summary: r.summary, args: r.args, subject: r.subject, createdAt: r.createdAt, decidedAt: r.decidedAt, status: r.status });
export const listPending = () => [...records.values()].filter((r) => r.status === "pending").map(view);
export const listDecided = (n = 10) => [...records.values()].filter((r) => r.status !== "pending").sort((a, b) => (b.decidedAt || 0) - (a.decidedAt || 0)).slice(0, n).map(view);
export const approvalsMode = () => MODE;
