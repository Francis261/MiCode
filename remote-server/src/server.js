import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "127.0.0.1";
const API_KEY = process.env.DEVFORGE_API_KEY || "";
const ROOTS = (process.env.DEVFORGE_WORKSPACES || "")
  .split(path.delimiter).map(s => path.resolve(s.trim())).filter(Boolean);
const COMMANDS = new Set((process.env.DEVFORGE_ALLOWED_COMMANDS || "git,npm,pnpm,yarn,node,python3")
  .split(",").map(s => s.trim()).filter(Boolean));
const MAX_BODY = 2 * 1024 * 1024;
const MAX_OUTPUT = 64 * 1024;
const MAX_FILE = 2 * 1024 * 1024;
const rate = new Map();

if (!API_KEY || API_KEY.length < 32) {
  console.error("Set DEVFORGE_API_KEY to a random secret of at least 32 characters.");
  process.exit(1);
}
if (!ROOTS.length) {
  console.error("Set DEVFORGE_WORKSPACES to one or more absolute workspace directories.");
  process.exit(1);
}

function authorized(req) {
  const header = req.headers.authorization || "";
  const supplied = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = Buffer.from(supplied);
  const b = Buffer.from(API_KEY);
  return a.length === b.length && timingSafeEqual(a, b);
}
function limited(req) {
  const key = req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const recent = (rate.get(key) || []).filter(t => now - t < 60_000);
  recent.push(now); rate.set(key, recent);
  return recent.length > 120;
}
function json(res, status, data) {
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  res.end(JSON.stringify(data));
}
async function body(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (Buffer.byteLength(raw) > MAX_BODY) throw new Error("Request body too large");
  }
  return raw ? JSON.parse(raw) : {};
}
async function workspaceRoot(name) {
  const root = ROOTS.find(r => path.basename(r) === name || r === path.resolve(name));
  if (!root) throw new Error("Workspace not allowed. Choose one of: " + ROOTS.map(path.basename).join(", "));
  const real = await fs.realpath(root);
  return real;
}
async function safePath(root, relative = ".") {
  if (typeof relative !== "string" || relative.includes("\\0")) throw new Error("Invalid path");
  const target = path.resolve(root, relative);
  if (target !== root && !target.startsWith(root + path.sep)) throw new Error("Path escapes workspace");
  let cursor = target;
  while (true) {
    try {
      const real = await fs.realpath(cursor);
      if (real !== root && !real.startsWith(root + path.sep)) throw new Error("Symlink escapes workspace");
      break;
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
      const parent = path.dirname(cursor);
      if (parent === cursor) throw e;
      cursor = parent;
    }
  }
  return target;
}
function textResult(value) { return { content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }] }; }

function buildMcp() {
  const mcp = new McpServer({ name: "devforge-remote", version: "1.0.0" });

  mcp.registerTool("workspace_list", {
    description: "List configured workspaces and their top-level entries.",
    inputSchema: { workspace: z.string().optional() }
  }, async ({ workspace }) => {
    const roots = workspace ? [await workspaceRoot(workspace)] : ROOTS;
    const result = [];
    for (const root of roots) {
      const entries = await fs.readdir(root, { withFileTypes: true });
      result.push({ workspace: path.basename(root), path: root, entries: entries.slice(0, 200).map(e => ({ name: e.name, type: e.isDirectory() ? "directory" : "file" })) });
    }
    return textResult(result);
  });

  mcp.registerTool("list_files", {
    description: "List files and directories under an allowed workspace-relative path.",
    inputSchema: { workspace: z.string(), path: z.string().optional() }
  }, async ({ workspace, path: rel = "." }) => {
    const root = await workspaceRoot(workspace), target = await safePath(root, rel);
    const entries = await fs.readdir(target, { withFileTypes: true });
    return textResult(entries.slice(0, 500).map(e => ({ name: e.name, type: e.isDirectory() ? "directory" : e.isFile() ? "file" : "other" })));
  });

  mcp.registerTool("read_file", {
    description: "Read a UTF-8 text file (maximum 2 MiB) from an allowed workspace.",
    inputSchema: { workspace: z.string(), path: z.string() }
  }, async ({ workspace, path: rel }) => {
    const root = await workspaceRoot(workspace), target = await safePath(root, rel);
    const stat = await fs.stat(target);
    if (!stat.isFile() || stat.size > MAX_FILE) throw new Error("Not a regular file or file exceeds 2 MiB");
    return textResult(await fs.readFile(target, "utf8"));
  });

  mcp.registerTool("write_file", {
    description: "Create or replace a UTF-8 file inside an allowed workspace. Parent directories are created.",
    inputSchema: { workspace: z.string(), path: z.string(), content: z.string().max(MAX_FILE) }
  }, async ({ workspace, path: rel, content }) => {
    const root = await workspaceRoot(workspace), target = await safePath(root, rel);
    await fs.mkdir(path.dirname(target), { recursive: true });
    const checked = await safePath(root, rel);
    await fs.writeFile(checked, content, { encoding: "utf8", mode: 0o600 });
    return textResult({ ok: true, path: path.relative(root, checked), bytes: Buffer.byteLength(content) });
  });

  mcp.registerTool("delete_file", {
    description: "Delete a regular file in an allowed workspace. Requires confirm=true; directories are never deleted.",
    inputSchema: { workspace: z.string(), path: z.string(), confirm: z.boolean() }
  }, async ({ workspace, path: rel, confirm }) => {
    if (!confirm) throw new Error("Set confirm=true to delete this file");
    const root = await workspaceRoot(workspace), target = await safePath(root, rel);
    const stat = await fs.lstat(target);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("Only regular files can be deleted");
    await fs.unlink(target);
    return textResult({ ok: true, deleted: path.relative(root, target) });
  });

  mcp.registerTool("search_files", {
    description: "Search text files for a literal string within an allowed workspace; skips dependency and VCS folders.",
    inputSchema: { workspace: z.string(), query: z.string().min(1).max(500), path: z.string().optional(), max_results: z.number().int().min(1).max(200).optional() }
  }, async ({ workspace, query, path: rel = ".", max_results = 50 }) => {
    const root = await workspaceRoot(workspace), start = await safePath(root, rel);
    const ignored = new Set(["node_modules", ".git", ".next", "dist", "build", "vendor", ".venv"]);
    const hits = [];
    async function walk(dir) {
      if (hits.length >= max_results) return;
      let entries; try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
      for (const entry of entries) {
        if (hits.length >= max_results) break;
        if (entry.name.startsWith(".") && entry.name !== ".env.example") continue;
        if (entry.isDirectory()) { if (!ignored.has(entry.name)) await walk(path.join(dir, entry.name)); continue; }
        if (!entry.isFile()) continue;
        const file = path.join(dir, entry.name);
        try {
          const stat = await fs.stat(file); if (stat.size > 512_000) continue;
          const data = await fs.readFile(file, "utf8");
          if (data.includes("\u0000")) continue;
          data.split(/\r?\n/).forEach((line, i) => { if (line.includes(query) && hits.length < max_results) hits.push({ path: path.relative(root, file), line: i + 1, text: line.slice(0, 500) }); });
        } catch {}
      }
    }
    await walk(start);
    return textResult(hits);
  });

  mcp.registerTool("run_command", {
    description: "Run an installed program without a shell, in an allowed workspace. Program must be in DEVFORGE_ALLOWED_COMMANDS. Commands execute with the server OS user's permissions; only grant access to trusted clients.",
    inputSchema: { workspace: z.string(), command: z.string().min(1).max(80), args: z.array(z.string().max(2000)).max(80).optional(), timeout_ms: z.number().int().min(1000).max(120000).optional() }
  }, async ({ workspace, command, args = [], timeout_ms = 30000 }) => {
    if (!COMMANDS.has(command) || command.includes("/") || command.includes("\\")) throw new Error("Program is not in DEVFORGE_ALLOWED_COMMANDS");
    const root = await workspaceRoot(workspace);
    const output = await new Promise((resolve, reject) => {
      const commandEnv = { PATH: process.env.PATH || "", HOME: process.env.HOME || root, TMPDIR: process.env.TMPDIR || "/tmp", TEMP: process.env.TEMP || "/tmp", CI: "1", GIT_TERMINAL_PROMPT: "0" };
      if (process.env.SYSTEMROOT) commandEnv.SYSTEMROOT = process.env.SYSTEMROOT;
      const child = spawn(command, args, { cwd: root, shell: false, env: commandEnv, stdio: ["ignore", "pipe", "pipe"] });
      let stdout = "", stderr = "", timedOut = false;
      const timer = setTimeout(() => { timedOut = true; child.kill("SIGKILL"); }, timeout_ms);
      child.stdout.on("data", b => { if (stdout.length < MAX_OUTPUT) stdout += b.toString(); });
      child.stderr.on("data", b => { if (stderr.length < MAX_OUTPUT) stderr += b.toString(); });
      child.on("error", e => { clearTimeout(timer); reject(e); });
      child.on("close", (code, signal) => { clearTimeout(timer); resolve({ exit_code: code, signal, timed_out: timedOut, stdout, stderr }); });
    });
    return textResult(output);
  });

  return mcp;
}

const server = createServer(async (req, res) => {
  if (req.url === "/health" && req.method === "GET") return json(res, 200, { ok: true, service: "devforge-remote" });
  if (req.url !== "/mcp") return json(res, 404, { error: "Not found" });
  if (!authorized(req)) return json(res, 401, { error: "Unauthorized" });
  if (limited(req)) return json(res, 429, { error: "Rate limit exceeded" });
  try {
    const mcp = buildMcp();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => { void transport.close(); void mcp.close(); });
    await mcp.connect(transport);
    if (req.method === "POST") {
      const parsed = await body(req);
      await transport.handleRequest(req, res, parsed);
    } else {
      await transport.handleRequest(req, res);
    }
  } catch (error) {
    if (!res.headersSent) json(res, 400, { error: error.message || "Bad request" });
    else res.end();
  }
});

server.listen(PORT, HOST, () => {
  console.log(`DevForge remote MCP listening on http://${HOST}:${PORT}/mcp`);
  console.log("Configured workspaces:", ROOTS.map(path.basename).join(", "));
});
