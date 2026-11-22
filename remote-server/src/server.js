import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import chokidar from "chokidar";

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "127.0.0.1";
const ROOTS = (process.env.DEVFORGE_WORKSPACES || "")
  .split(path.delimiter).map(s => path.resolve(s.trim())).filter(Boolean);
const COMMANDS = new Set((process.env.DEVFORGE_ALLOWED_COMMANDS || "git,npm,pnpm,yarn,node,python3,bash,sh,zsh,python,pip,uv,go,cargo,make,cmake,ninja,clang,gcc,g++,rustc,jq,awk,sed,grep,find,rsync,tar,zip,unzip,curl,wget,ssh,scp,rsync,docker,kubectl,terraform,ansible,psql,mysql,redis-cli,mongo,sqlite3")
  .split(",").map(s => s.trim()).filter(Boolean));
const MAX_BODY = 4 * 1024 * 1024;
const MAX_OUTPUT = 256 * 1024;
const MAX_FILE = 4 * 1024 * 1024;
const rate = new Map();

if (!ROOTS.length) {
  console.error("Set DEVFORGE_WORKSPACES to one or more absolute workspace directories.");
  process.exit(1);
}
function limited(req) {
  const key = req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const recent = (rate.get(key) || []).filter(t => now - t < 60_000);
  recent.push(now); rate.set(key, recent);
  return recent.length > 200;
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
  const mcp = new McpServer({ name: "devforge-remote", version: "2.0.0" });

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
    inputSchema: { workspace: z.string(), path: z.string().optional(), recursive: z.boolean().optional(), max_depth: z.number().int().min(1).max(10).optional() }
  }, async ({ workspace, path: rel = ".", recursive = false, max_depth = 3 }) => {
    const root = await workspaceRoot(workspace), target = await safePath(root, rel);
    const entries = [];
    async function walk(dir, depth = 0) {
      if (depth > max_depth) return;
      let ents; try { ents = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
      for (const e of ents) {
        const full = path.join(dir, e.name);
        const p = path.relative(root, full);
        entries.push({ path: p + (e.isDirectory() ? "/" : ""), type: e.isDirectory() ? "directory" : e.isFile() ? "file" : "other", size: e.isFile() ? (await fs.stat(full)).size : undefined });
        if (recursive && e.isDirectory() && depth < max_depth) await walk(full, depth + 1);
      }
    }
    await walk(target);
    return textResult(entries.slice(0, 2000));
  });

  mcp.registerTool("read_file", {
    description: "Read a UTF-8 text file (maximum 4 MiB) from an allowed workspace.",
    inputSchema: { workspace: z.string(), path: z.string(), offset: z.number().int().min(0).optional(), limit: z.number().int().min(1).max(1_000_000).optional() }
  }, async ({ workspace, path: rel, offset = 0, limit }) => {
    const root = await workspaceRoot(workspace), target = await safePath(root, rel);
    const stat = await fs.stat(target);
    if (!stat.isFile() || stat.size > MAX_FILE) throw new Error("Not a regular file or file exceeds 4 MiB");
    const fd = await fs.open(target, "r");
    const buffer = Buffer.alloc(limit || Math.min(MAX_FILE, stat.size - offset));
    const { bytesRead } = await fd.read(buffer, 0, buffer.length, offset);
    await fd.close();
    return textResult(buffer.subarray(0, bytesRead).toString("utf8"));
  });

  mcp.registerTool("read_multiple_files", {
    description: "Read several UTF-8 files from one workspace (max 50 files, 4 MiB each).",
    inputSchema: { workspace: z.string(), paths: z.array(z.string()).min(1).max(50) }
  }, async ({ workspace, paths }) => {
    const root = await workspaceRoot(workspace);
    const out = {};
    for (const p of paths) {
      const target = await safePath(root, p);
      const stat = await fs.stat(target);
      if (!stat.isFile() || stat.size > MAX_FILE) { out[p] = "[Skipped: not a regular file or exceeds 4 MiB]"; continue; }
      out[p] = await fs.readFile(target, "utf8");
    }
    return textResult(out);
  });

  mcp.registerTool("write_file", {
    description: "Create or replace a UTF-8 file inside an allowed workspace. Parent directories are created.",
    inputSchema: { workspace: z.string(), path: z.string(), content: z.string().max(MAX_FILE), create_directories: z.boolean().optional() }
  }, async ({ workspace, path: rel, content, create_directories = true }) => {
    const root = await workspaceRoot(workspace), target = await safePath(root, rel);
    if (create_directories) await fs.mkdir(path.dirname(target), { recursive: true });
    const checked = await safePath(root, rel);
    await fs.writeFile(checked, content, { encoding: "utf8", mode: 0o600 });
    return textResult({ ok: true, path: path.relative(root, checked), bytes: Buffer.byteLength(content) });
  });

  mcp.registerTool("edit_file", {
    description: "Apply a unified diff patch or replace exact text in a file. Use for surgical edits without rewriting entire files.",
    inputSchema: {
      workspace: z.string(),
      path: z.string(),
      old_text: z.string().optional(),
      new_text: z.string().optional(),
      diff: z.string().optional(),
      replace_all: z.boolean().optional()
    }
  }, async ({ workspace, path: rel, old_text, new_text, diff, replace_all = false }) => {
    const root = await workspaceRoot(workspace), target = await safePath(root, rel);
    let content = await fs.readFile(target, "utf8");

    if (diff) {
      const lines = content.split(/\r?\n/);
      const hunks = parseUnifiedDiff(diff);
      let offset = 0;
      for (const hunk of hunks) {
        const start = Math.max(0, hunk.old_start - 1 + offset);
        const oldLines = hunk.old_lines;
        const newLines = hunk.new_lines;
        let match = false;
        for (let i = 0; i <= lines.length - oldLines.length; i++) {
          if (lines.slice(i, i + oldLines.length).join("\n") === oldLines.join("\n")) {
            lines.splice(i, oldLines.length, ...newLines);
            offset += newLines.length - oldLines.length;
            match = true;
            break;
          }
        }
        if (!match) throw new Error(`Hunk failed to apply at line ${hunk.old_start}: context mismatch`);
      }
      content = lines.join("\n");
    } else if (old_text !== undefined && new_text !== undefined) {
      if (!content.includes(old_text)) throw new Error("old_text not found in file");
      const count = content.split(old_text).length - 1;
      if (count > 1 && !replace_all) throw new Error(`Found ${count} matches; set replace_all=true or provide more specific old_text`);
      content = replace_all ? content.split(old_text).join(new_text) : content.replace(old_text, new_text);
    } else {
      throw new Error("Provide either (old_text, new_text) or a unified diff");
    }

    await fs.writeFile(target, content, { encoding: "utf8", mode: 0o600 });
    return textResult({ ok: true, path: path.relative(root, target), bytes: Buffer.byteLength(content) });
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

  mcp.registerTool("create_directory", {
    description: "Create a directory inside an allowed workspace.",
    inputSchema: { workspace: z.string(), path: z.string() }
  }, async ({ workspace, path: rel }) => {
    const root = await workspaceRoot(workspace), target = await safePath(root, rel);
    await fs.mkdir(target, { recursive: true });
    return textResult({ created: path.relative(root, target) });
  });

  mcp.registerTool("move_path", {
    description: "Move or rename a file or directory within the same workspace.",
    inputSchema: { workspace: z.string(), from: z.string(), to: z.string(), confirm: z.boolean() }
  }, async ({ workspace, from, to, confirm }) => {
    if (!confirm) throw new Error("Move/rename requires confirm=true");
    const root = await workspaceRoot(workspace);
    const src = await safePath(root, from);
    const dst = await safePath(root, to);
    await fs.mkdir(path.dirname(dst), { recursive: true });
    await fs.rename(src, dst);
    return textResult({ moved: from, to });
  });

  mcp.registerTool("search_files", {
    description: "Search file paths by glob pattern or regex within an allowed workspace.",
    inputSchema: { workspace: z.string(), query: z.string(), regex: z.boolean().optional(), path: z.string().optional(), max_results: z.number().int().min(1).max(1000).optional() }
  }, async ({ workspace, query, regex = false, path: rel = ".", max_results = 200 }) => {
    const root = await workspaceRoot(workspace), start = await safePath(root, rel);
    const re = regex ? new RegExp(query) : globToRegex(query);
    const hits = [];
    const ignored = new Set(["node_modules", ".git", ".next", "dist", "build", "vendor", ".venv", "__pycache__", ".pytest_cache", ".ruff_cache"]);
    async function walk(dir) {
      if (hits.length >= max_results) return;
      let entries; try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
      for (const e of entries) {
        if (hits.length >= max_results) break;
        if (ignored.has(e.name)) continue;
        const full = path.join(dir, e.name);
        const relPath = path.relative(root, full);
        if (re.test(relPath) || re.test(e.name)) hits.push({ path: relPath + (e.isDirectory() ? "/" : ""), type: e.isDirectory() ? "directory" : "file" });
        if (e.isDirectory()) await walk(full);
      }
    }
    await walk(start);
    return textResult(hits);
  });

  mcp.registerTool("search_content", {
    description: "Search file contents with regex, returning matches with context lines.",
    inputSchema: {
      workspace: z.string(),
      query: z.string(),
      regex: z.boolean().optional(),
      case_sensitive: z.boolean().optional(),
      path: z.string().optional(),
      max_results: z.number().int().min(1).max(500).optional(),
      context_lines: z.number().int().min(0).max(10).optional()
    }
  }, async ({ workspace, query, regex = false, case_sensitive = false, path: rel = ".", max_results = 100, context_lines = 2 }) => {
    const root = await workspaceRoot(workspace), start = await safePath(root, rel);
    const flags = case_sensitive ? "" : "i";
    const re = regex ? new RegExp(query, flags) : null;
    const hits = [];
    const ignored = new Set(["node_modules", ".git", ".next", "dist", "build", "vendor", ".venv", "__pycache__", ".pytest_cache", ".ruff_cache", "*.min.js", "*.map", "package-lock.json", "yarn.lock", "pnpm-lock.yaml"]);
    async function walk(dir) {
      if (hits.length >= max_results) return;
      let entries; try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
      for (const e of entries) {
        if (hits.length >= max_results) break;
        if (ignored.has(e.name) || e.name.endsWith(".min.js") || e.name.endsWith(".map")) continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { if (!ignored.has(e.name)) await walk(full); continue; }
        if (!e.isFile()) continue;
        try {
          const stat = await fs.stat(full); if (stat.size > 1_000_000) continue;
          const data = await fs.readFile(full, "utf8");
          if (data.includes("\u0000")) continue;
          const lines = data.split(/\r?\n/);
          for (let i = 0; i < lines.length; i++) {
            const match = regex ? re.test(lines[i]) : lines[i].toLowerCase().includes(query.toLowerCase());
            if (match) {
              const start = Math.max(0, i - context_lines);
              const end = Math.min(lines.length, i + context_lines + 1);
              hits.push({
                path: path.relative(root, full),
                line: i + 1,
                match: lines[i].slice(0, 500),
                context: lines.slice(start, end).map((l, idx) => `${start + idx + 1}: ${l}`).join("\n")
              });
              if (hits.length >= max_results) break;
            }
          }
        } catch {}
      }
    }
    await walk(start);
    return textResult(hits);
  });

  mcp.registerTool("run_command", {
    description: "Run an allowed command in a workspace. No shell - use explicit args. Supports long-running commands with timeout.",
    inputSchema: { workspace: z.string(), command: z.string().min(1).max(100), args: z.array(z.string().max(4000)).max(100).optional(), timeout_ms: z.number().int().min(1000).max(300000).optional(), env: z.record(z.string()).optional() }
  }, async ({ workspace, command, args = [], timeout_ms = 60000, env = {} }) => {
    if (!COMMANDS.has(command) || command.includes("/") || command.includes("\\")) throw new Error(`Command '${command}' not in DEVFORGE_ALLOWED_COMMANDS`);
    const root = await workspaceRoot(workspace);
    const output = await new Promise((resolve, reject) => {
      const commandEnv = { PATH: process.env.PATH || "", HOME: process.env.HOME || root, TMPDIR: process.env.TMPDIR || "/tmp", TEMP: process.env.TEMP || "/tmp", CI: "1", GIT_TERMINAL_PROMPT: "0", ...env };
      if (process.env.SYSTEMROOT) commandEnv.SYSTEMROOT = process.env.SYSTEMROOT;
      const child = spawn(command, args, { cwd: root, shell: false, env: commandEnv, stdio: ["ignore", "pipe", "pipe"] });
      let stdout = "", stderr = "", timedOut = false;
      const timer = setTimeout(() => { timedOut = true; child.kill("SIGTERM"); setTimeout(() => child.kill("SIGKILL"), 2000).unref(); }, timeout_ms);
      child.stdout.on("data", b => { if (stdout.length < MAX_OUTPUT) stdout += b.toString(); });
      child.stderr.on("data", b => { if (stderr.length < MAX_OUTPUT) stderr += b.toString(); });
      child.on("error", e => { clearTimeout(timer); reject(e); });
      child.on("close", (code, signal) => { clearTimeout(timer); resolve({ exit_code: code, signal, timed_out: timedOut, stdout, stderr }); });
    });
    return textResult(output);
  });

  mcp.registerTool("git_status", {
    description: "Show Git status for a workspace.",
    inputSchema: { workspace: z.string() }
  }, async ({ workspace }) => {
    const root = await workspaceRoot(workspace);
    return textResult(await runGit(root, ["status", "--short", "--branch"]));
  });

  mcp.registerTool("git_diff", {
    description: "Show Git diff (working tree, staged, or between commits).",
    inputSchema: { workspace: z.string(), path: z.string().optional(), staged: z.boolean().optional(), commit: z.string().optional() }
  }, async ({ workspace, path: rel, staged = false, commit }) => {
    const root = await workspaceRoot(workspace);
    const args = ["diff"];
    if (staged) args.push("--cached");
    if (commit) args.push(commit);
    if (rel) { const target = await safePath(root, rel); args.push("--", path.relative(root, target)); }
    return textResult(await runGit(root, args));
  });

  mcp.registerTool("git_log", {
    description: "Show recent Git commits.",
    inputSchema: { workspace: z.string(), limit: z.number().int().min(1).max(200).optional(), oneline: z.boolean().optional(), path: z.string().optional() }
  }, async ({ workspace, limit = 20, oneline = true, path: rel }) => {
    const root = await workspaceRoot(workspace);
    const args = ["log", `-n${limit}`, oneline ? "--oneline" : "--pretty=format:%H %s (%an, %ar)", "--decorate"];
    if (rel) { const target = await safePath(root, rel); args.push("--", path.relative(root, target)); }
    return textResult(await runGit(root, args));
  });

  mcp.registerTool("git_branch", {
    description: "List, create, or delete Git branches.",
    inputSchema: { workspace: z.string(), action: z.enum(["list", "create", "delete", "current"]), name: z.string().optional(), force: z.boolean().optional() }
  }, async ({ workspace, action, name, force = false }) => {
    const root = await workspaceRoot(workspace);
    let args;
    switch (action) {
      case "list": args = ["branch", "-a"]; break;
      case "create": if (!name) throw new Error("Branch name required"); args = ["branch", name]; break;
      case "delete": if (!name) throw new Error("Branch name required"); args = ["branch", force ? "-D" : "-d", name]; break;
      case "current": args = ["branch", "--show-current"]; break;
    }
    return textResult(await runGit(root, args));
  });

  mcp.registerTool("git_checkout", {
    description: "Switch branches or restore files.",
    inputSchema: { workspace: z.string(), target: z.string(), create: z.boolean().optional(), path: z.string().optional() }
  }, async ({ workspace, target, create = false, path: rel }) => {
    const root = await workspaceRoot(workspace);
    const args = ["checkout"];
    if (create) args.push("-b");
    args.push(target);
    if (rel) { const p = await safePath(root, rel); args.push("--", path.relative(root, p)); }
    return textResult(await runGit(root, args));
  });

  mcp.registerTool("git_commit", {
    description: "Create a Git commit with staged changes.",
    inputSchema: { workspace: z.string(), message: z.string(), add_all: z.boolean().optional() }
  }, async ({ workspace, message, add_all = false }) => {
    const root = await workspaceRoot(workspace);
    if (add_all) await runGit(root, ["add", "-A"]);
    return textResult(await runGit(root, ["commit", "-m", message]));
  });

  mcp.registerTool("git_push", {
    description: "Push commits to remote.",
    inputSchema: { workspace: z.string(), remote: z.string().optional(), branch: z.string().optional(), force: z.boolean().optional() }
  }, async ({ workspace, remote = "origin", branch, force = false }) => {
    const root = await workspaceRoot(workspace);
    const args = ["push", remote];
    if (branch) args.push(branch);
    if (force) args.push("--force-with-lease");
    return textResult(await runGit(root, args));
  });

  mcp.registerTool("git_pull", {
    description: "Pull changes from remote.",
    inputSchema: { workspace: z.string(), remote: z.string().optional(), branch: z.string().optional(), rebase: z.boolean().optional() }
  }, async ({ workspace, remote = "origin", branch, rebase = false }) => {
    const root = await workspaceRoot(workspace);
    const args = ["pull", remote];
    if (branch) args.push(branch);
    if (rebase) args.push("--rebase");
    return textResult(await runGit(root, args));
  });

  mcp.registerTool("todo_write", {
    description: "Manage a todo list for the current task. Use to track progress on multi-step operations.",
    inputSchema: {
      workspace: z.string(),
      action: z.enum(["get", "set", "add", "update", "remove", "clear"]),
      todos: z.array(z.object({ id: z.string(), title: z.string(), status: z.enum(["pending", "in_progress", "completed"]), priority: z.enum(["low", "medium", "high"]).optional() })).optional(),
      id: z.string().optional(),
      updates: z.object({ title: z.string().optional(), status: z.enum(["pending", "in_progress", "completed"]).optional(), priority: z.enum(["low", "medium", "high"]).optional() }).optional()
    }
  }, async ({ workspace, action, todos, id, updates }) => {
    const root = await workspaceRoot(workspace);
    const todoFile = path.join(root, ".devforge-todos.json");
    let current = [];
    try { current = JSON.parse(await fs.readFile(todoFile, "utf8")); } catch {}
    switch (action) {
      case "get": return textResult(current);
      case "set": await fs.writeFile(todoFile, JSON.stringify(todos || [], null, 2)); return textResult({ ok: true, count: todos?.length || 0 });
      case "add": if (todos) { current.push(...todos); await fs.writeFile(todoFile, JSON.stringify(current, null, 2)); } return textResult({ ok: true, count: current.length });
      case "update": if (id && updates) { const idx = current.findIndex(t => t.id === id); if (idx >= 0) { current[idx] = { ...current[idx], ...updates }; await fs.writeFile(todoFile, JSON.stringify(current, null, 2)); } } return textResult({ ok: true });
      case "remove": if (id) { current = current.filter(t => t.id !== id); await fs.writeFile(todoFile, JSON.stringify(current, null, 2)); } return textResult({ ok: true, count: current.length });
      case "clear": await fs.writeFile(todoFile, "[]"); return textResult({ ok: true });
    }
  });

  mcp.registerTool("apply_patch", {
    description: "Apply a unified diff patch to one or more files. Accepts git-style diffs from external tools, code reviews, or AI-generated patches.",
    inputSchema: {
      workspace: z.string(),
      patch: z.string(),
      dry_run: z.boolean().optional(),
      strip: z.number().int().min(0).max(5).optional()
    }
  }, async ({ workspace, patch, dry_run = false, strip = 1 }) => {
    const root = await workspaceRoot(workspace);
    const hunks = parseUnifiedDiff(patch);
    if (!hunks.length) throw new Error("No valid hunks found in patch");
    
    const results = [];
    const fileHunks = new Map();
    for (const hunk of hunks) {
      const file = hunk.file || "";
      if (!fileHunks.has(file)) fileHunks.set(file, []);
      fileHunks.get(file).push(hunk);
    }

    for (const [relPath, fileHunksList] of fileHunks) {
      let targetPath = relPath;
      if (strip > 0) {
        const parts = relPath.split(path.sep).slice(strip).join(path.sep);
        targetPath = parts || relPath;
      }
      const target = await safePath(root, targetPath);
      let content = "";
      try { content = await fs.readFile(target, "utf8"); } catch (e) {
        if (e.code === "ENOENT") content = "";
        else throw e;
      }
      const lines = content.split(/\r?\n/);
      let offset = 0;
      for (const hunk of fileHunksList) {
        const start = Math.max(0, hunk.old_start - 1 + offset);
        const oldLines = hunk.old_lines;
        const newLines = hunk.new_lines;
        let match = false;
        for (let i = 0; i <= lines.length - oldLines.length; i++) {
          if (lines.slice(i, i + oldLines.length).join("\n") === oldLines.join("\n")) {
            lines.splice(i, oldLines.length, ...newLines);
            offset += newLines.length - oldLines.length;
            match = true;
            break;
          }
        }
        if (!match) throw new Error(`Hunk failed in ${targetPath} at line ${hunk.old_start}: context mismatch`);
      }
      const newContent = lines.join("\n");
      if (!dry_run) {
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, newContent, { encoding: "utf8", mode: 0o600 });
      }
      results.push({ path: path.relative(root, target), ok: true, lines_changed: Math.abs(newContent.split("\n").length - content.split("\n").length), dry_run });
    }
    return textResult({ applied: results.length, results, dry_run });
  });

  mcp.registerTool("watch_files", {
    description: "Start watching a directory for changes. Returns a session ID. Use watch_files_poll to get changes.",
    inputSchema: {
      workspace: z.string(),
      path: z.string().optional(),
      recursive: z.boolean().optional(),
      events: z.array(z.enum(["change", "rename", "add", "remove"])).optional()
    }
  }, async ({ workspace, path: rel = ".", recursive = true, events = ["change", "add", "remove"] }) => {
    const root = await workspaceRoot(workspace);
    const target = await safePath(root, rel);
    const sessionId = `watch_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    
    if (!global.watchSessions) global.watchSessions = new Map();
    const ignored = ["node_modules", ".git", ".next", "dist", "build", "vendor", ".venv", "__pycache__", ".pytest_cache", ".ruff_cache"];
    
    const changes = [];
    const watcher = chokidar.watch(target, {
      ignored,
      persistent: true,
      ignoreInitial: true,
      followSymlinks: false,
      depth: recursive ? undefined : 0
    });
    
    const eventMap = { add: "add", addDir: "add", change: "change", unlink: "remove", unlinkDir: "remove" };
    watcher.on("all", (eventType, fullPath) => {
      const mapped = eventMap[eventType];
      if (!mapped || !events.includes(mapped)) return;
      const relPath = path.relative(root, fullPath);
      changes.push({ event: mapped, path: relPath, time: Date.now() });
    });
    
    global.watchSessions.set(sessionId, { root, target, changes, watcher, events, created: Date.now() });
    
    return textResult({ session_id: sessionId, status: "watching", target: path.relative(root, target) });
  });

  mcp.registerTool("watch_files_poll", {
    description: "Poll for file changes from a watch session. Returns changes since last poll.",
    inputSchema: {
      workspace: z.string(),
      session_id: z.string(),
      clear: z.boolean().optional()
    }
  }, async ({ workspace, session_id, clear = false }) => {
    if (!global.watchSessions || !global.watchSessions.has(session_id)) {
      throw new Error("Invalid or expired watch session");
    }
    const session = global.watchSessions.get(session_id);
    const root = await workspaceRoot(workspace);
    if (session.root !== root) throw new Error("Session workspace mismatch");
    
    const changes = [...session.changes];
    if (clear) session.changes.length = 0;
    return textResult({ session_id, changes, watching: session.target });
  });

  mcp.registerTool("watch_files_stop", {
    description: "Stop a file watch session.",
    inputSchema: { workspace: z.string(), session_id: z.string() }
  }, async ({ workspace, session_id }) => {
    if (!global.watchSessions || !global.watchSessions.has(session_id)) {
      throw new Error("Invalid or expired watch session");
    }
    const session = global.watchSessions.get(session_id);
    const root = await workspaceRoot(workspace);
    if (session.root !== root) throw new Error("Session workspace mismatch");
    
    await session.watcher.close();
    global.watchSessions.delete(session_id);
    return textResult({ session_id, stopped: true });
  });

  // LSP tools disabled for now - syntax issue with vscode-languageserver
  // TODO: Re-enable after fixing syntax issue

  return mcp;
}

async function runGit(cwd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn("git", args, { cwd, shell: false, env: { ...process.env, GIT_TERMINAL_PROMPT: "0", CI: "1" }, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    child.stdout.on("data", d => stdout += d.toString());
    child.stderr.on("data", d => stderr += d.toString());
    child.on("error", reject);
    child.on("close", code => {
      if (code === 0) resolve({ stdout, stderr });
      else resolve({ stdout, stderr, exit_code: code });
    });
  });
}

function globToRegex(pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  const regex = escaped.replace(/\*/g, ".*").replace(/\?/g, ".");
  return new RegExp(`^${regex}$`);
}

function parseUnifiedDiff(diff) {
  const hunks = [];
  const lines = diff.split(/\r?\n/);
  let currentFile = "";
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const fileMatch = line.match(/^(?:---|\+\+\+)\s+(.+)/);
    if (fileMatch && !currentFile) {
      currentFile = fileMatch[1].replace(/^[ab]\//, "");
      if (currentFile.startsWith("/dev/null")) currentFile = "";
    }
    const match = line.match(/^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
    if (match) {
      const old_start = parseInt(match[1], 10);
      const old_count = match[2] ? parseInt(match[2], 10) : 1;
      const new_start = parseInt(match[3], 10);
      const new_count = match[4] ? parseInt(match[4], 10) : 1;
      const old_lines = [];
      const new_lines = [];
      i++;
      while (i < lines.length && !lines[i].match(/^@@/)) {
        const l = lines[i];
        if (l.startsWith(" ") || l.startsWith("+")) new_lines.push(l.slice(1));
        if (l.startsWith(" ") || l.startsWith("-")) old_lines.push(l.slice(1));
        i++;
      }
      hunks.push({ file: currentFile, old_start, old_count, new_start, new_count, old_lines, new_lines });
    } else {
      i++;
    }
  }
  return hunks;
}

const server = createServer(async (req, res) => {
  if (req.url === "/health" && req.method === "GET") return json(res, 200, { ok: true, service: "devforge-remote", version: "2.0.0" });
  if (req.url !== "/mcp") return json(res, 404, { error: "Not found" });
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
  console.log(`DevForge remote MCP v2.0 listening on http://${HOST}:${PORT}/mcp`);
  console.log("Configured workspaces:", ROOTS.map(r => path.basename(r)).join(", "));
});