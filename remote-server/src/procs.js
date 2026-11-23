import { spawn } from "node:child_process";
import { redactString } from "./audit.js";

/**
 * Background processes: start dev servers, builds, watchers; read their logs; send input; stop them.
 * Only offered when command access is unrestricted (it runs shell lines). Children are stopped when the
 * server stops, so they do not survive a restart.
 */
const MAX_LOG = 512 * 1024;
const MAX_RUNNING = Math.max(1, Number(process.env.MICODE_MAX_PROCS || 10));
const procs = new Map();
let counter = 0;

const killGroup = (p, sig) => { try { process.kill(-p.pid, sig); } catch { try { p.child.kill(sig); } catch { /* gone */ } } };
const running = () => [...procs.values()].filter((p) => p.status === "running");

setInterval(() => {
  const cutoff = Date.now() - 3600_000;
  for (const [id, p] of procs) if (p.status !== "running" && (p.endedAt || 0) < cutoff) procs.delete(id);
}, 300_000).unref();
process.once("exit", () => { for (const p of running()) killGroup(p, "SIGKILL"); });
for (const sig of ["SIGTERM", "SIGINT"]) process.once(sig, () => { for (const p of running()) killGroup(p, "SIGKILL"); process.exit(0); });

export function procSummary() {
  return [...procs.values()].map((p) => ({ id: p.id, name: p.name, status: p.status, command: redactString(p.command).slice(0, 120), startedAt: p.startedAt }));
}

function brief(p) {
  return { id: p.id, name: p.name, status: p.status, pid: p.pid, command: redactString(p.command).slice(0, 200), cwd: p.cwd, started: new Date(p.startedAt).toISOString(), ended: p.endedAt ? new Date(p.endedAt).toISOString() : null, exit_code: p.exitCode, signal: p.signal };
}

function append(p, chunk) {
  p.buf += chunk;
  p.total += chunk.length;
  if (p.buf.length > MAX_LOG) p.buf = p.buf.slice(p.buf.length - MAX_LOG);
}

export function registerProcs(mcp, d) {
  if (!d.ALLOW_ANY_COMMAND) return;
  const { z, textResult, workspaceRoot, safePath } = d;
  const need = (id) => { const p = procs.get(id); if (!p) throw new Error(`No process '${id}'. Use process_list.`); return p; };

  mcp.registerTool("process_start", {
    description: "Start a long-running shell command in the background (dev server, build, watcher, tunnel). Returns an id; use process_logs to read output (optionally wait_for a regex like 'ready'), process_input to type into it, process_stop to end it. Stopped automatically when the server restarts.",
    inputSchema: { workspace: z.string(), command: z.string().min(1).max(20000), cwd: z.string().optional(), name: z.string().max(40).optional(), env: z.record(z.string()).optional() },
  }, async ({ workspace, command, cwd: rel, name, env = {} }) => {
    if (running().length >= MAX_RUNNING) throw new Error(`Too many running processes (limit ${MAX_RUNNING}). Stop one first.`);
    const root = await workspaceRoot(workspace);
    const dir = rel ? await safePath(root, rel) : root;
    const id = `p${++counter}`;
    const childEnv = { PATH: process.env.PATH || "", HOME: process.env.HOME || root, TMPDIR: process.env.TMPDIR || "/tmp", LANG: process.env.LANG || "C.UTF-8", CI: "1", FORCE_COLOR: "0", ...env };
    const child = spawn("bash", ["-c", command], { cwd: dir, shell: false, detached: true, env: childEnv, stdio: ["pipe", "pipe", "pipe"] });
    const p = { id, name: name || "", command, cwd: dir, workspace, child, pid: child.pid, startedAt: Date.now(), status: "running", exitCode: null, signal: null, buf: "", total: 0, stopping: false };
    procs.set(id, p);
    child.stdout.on("data", (b) => append(p, b.toString()));
    child.stderr.on("data", (b) => append(p, b.toString()));
    child.stdin.on("error", () => { /* process ended */ });
    child.on("error", (e) => { p.status = "failed"; p.endedAt = Date.now(); append(p, `\n[spawn error] ${e.message}\n`); });
    child.on("close", (code, signal) => {
      if (p.status === "running") p.status = p.stopping ? "stopped" : "exited";
      p.exitCode = code; p.signal = signal; p.endedAt = Date.now();
    });
    await new Promise((r) => setTimeout(r, 300)); // catch immediate crashes
    return textResult({ ...brief(p), hint: "Read output with process_logs." });
  });

  mcp.registerTool("process_list", {
    description: "List background processes (running and recently finished).",
    inputSchema: {},
  }, async () => textResult([...procs.values()].map(brief)));

  mcp.registerTool("process_logs", {
    description: "Read output of a background process. Without 'since' returns the last tail_lines lines; pass the returned next_offset as 'since' to read only new output. wait_for (regex) blocks up to timeout_ms (max 60000) until it appears or the process exits.",
    inputSchema: { id: z.string(), tail_lines: z.number().int().min(1).max(2000).optional(), since: z.number().int().min(0).optional(), wait_for: z.string().max(200).optional(), timeout_ms: z.number().int().min(100).max(60000).optional() },
  }, async ({ id, tail_lines = 100, since, wait_for, timeout_ms = 15000 }) => {
    const p = need(id);
    let matched = null;
    if (wait_for) {
      let re; try { re = new RegExp(wait_for, "i"); } catch { throw new Error("wait_for is not a valid regular expression"); }
      const deadline = Date.now() + timeout_ms;
      const from = since ?? 0;
      for (;;) {
        const start = p.total - p.buf.length;
        const text = p.buf.slice(Math.max(0, from - start));
        if (re.test(text)) { matched = true; break; }
        if (p.status !== "running" || Date.now() > deadline) { matched = false; break; }
        await new Promise((r) => setTimeout(r, 250));
      }
    }
    const start = p.total - p.buf.length;
    let text;
    if (since === undefined) text = p.buf.split("\n").slice(-tail_lines).join("\n");
    else text = p.buf.slice(Math.max(0, since - start));
    const out = { id: p.id, status: p.status, exit_code: p.exitCode, next_offset: p.total, output: redactString(text) };
    if (since !== undefined && since < start) out.note = "Older output was dropped from the buffer.";
    if (matched !== null) out.wait_for_matched = matched;
    return textResult(out);
  });

  mcp.registerTool("process_input", {
    description: "Write text to a background process's stdin (a newline is appended unless newline=false).",
    inputSchema: { id: z.string(), text: z.string().max(10000), newline: z.boolean().optional() },
  }, async ({ id, text, newline = true }) => {
    const p = need(id);
    if (p.status !== "running") throw new Error(`Process ${id} is ${p.status}`);
    p.child.stdin.write(newline ? `${text}\n` : text);
    return textResult({ ok: true });
  });

  mcp.registerTool("process_stop", {
    description: "Stop a background process and its children (SIGTERM, then SIGKILL after 5s; force=true kills immediately).",
    inputSchema: { id: z.string(), force: z.boolean().optional() },
  }, async ({ id, force = false }) => {
    const p = need(id);
    if (p.status !== "running") return textResult(brief(p));
    p.stopping = true;
    killGroup(p, force ? "SIGKILL" : "SIGTERM");
    if (!force) setTimeout(() => { if (p.status === "running") killGroup(p, "SIGKILL"); }, 5000).unref();
    for (let i = 0; i < 30 && p.status === "running"; i++) await new Promise((r) => setTimeout(r, 100));
    return textResult(brief(p));
  });
}
