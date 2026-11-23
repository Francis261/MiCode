import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { procSummary } from "./procs.js";

const execFileP = promisify(execFile);
const gb = (n) => Math.round((n / 1e9) * 100) / 100;
const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);
const run = async (cmd, args, cwd) => {
  try { return (await execFileP(cmd, args, { cwd, timeout: 15_000, maxBuffer: 16 * 1024 * 1024, env: { PATH: process.env.PATH, HOME: process.env.HOME || "/root", LC_ALL: "C" } })).stdout; } catch { return ""; }
};

async function topProcesses(sort) {
  // 'comm' only (never full arguments, which can contain tokens)
  const out = await run("ps", ["-eo", "pid,pcpu,pmem,rss,etime,comm", `--sort=${sort}`]);
  return out.split("\n").slice(1, 9).map((l) => l.trim().split(/\s+/)).filter((p) => p.length >= 6)
    .map(([pid, cpu, mem, rss, etime, ...cmd]) => ({ pid: Number(pid), cpu_pct: Number(cpu), mem_pct: Number(mem), rss_mb: Math.round(Number(rss) / 1024), running_for: etime, command: cmd.join(" ") }));
}

function disks(paths) {
  const seen = new Set();
  const out = [];
  for (const p of paths) {
    try {
      const s = fs.statfsSync(p);
      const total = s.blocks * s.bsize, free = s.bavail * s.bsize;
      const key = `${s.blocks}:${s.bfree}:${s.type}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ path: p, total_gb: gb(total), free_gb: gb(free), used_pct: pct(total - free, total) });
    } catch { /* unreadable */ }
  }
  return out;
}

// ---------------- project map ----------------
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", ".expo", "__pycache__", "venv", ".venv", "target", "coverage", ".cache", ".turbo", "vendor", "Pods"]);
const LANGS = { js: "JavaScript", jsx: "JavaScript", mjs: "JavaScript", cjs: "JavaScript", ts: "TypeScript", tsx: "TypeScript", py: "Python", go: "Go", rs: "Rust", java: "Java", kt: "Kotlin", swift: "Swift", rb: "Ruby", php: "PHP", c: "C", h: "C", cpp: "C++", cs: "C#", sh: "Shell", sql: "SQL", html: "HTML", css: "CSS", scss: "CSS", json: "JSON", md: "Markdown", yml: "YAML", yaml: "YAML", toml: "TOML" };
const CODE_EXT = new Set(["js", "jsx", "mjs", "cjs", "ts", "tsx", "py", "go", "rs", "java", "kt", "swift", "rb", "php", "c", "h", "cpp", "cs", "sh", "sql"]);

function walk(dir, limit) {
  const out = [];
  const stack = [dir];
  while (stack.length && out.length < limit) {
    const cur = stack.pop();
    let entries; try { entries = fs.readdirSync(cur, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name) && !e.name.startsWith(".git")) stack.push(path.join(cur, e.name)); }
      else if (e.isFile()) out.push(path.relative(dir, path.join(cur, e.name)));
      if (out.length >= limit) break;
    }
  }
  return out;
}

const readHead = (file, n = 2000) => { try { return fs.readFileSync(file, "utf8").slice(0, n); } catch { return null; } };

async function buildMap(dir, { maxDepth, maxEntries }) {
  const gitRoot = (await run("git", ["rev-parse", "--show-toplevel"], dir)).trim();
  let files;
  if (gitRoot) files = (await run("git", ["ls-files", "-co", "--exclude-standard", "-z"], dir)).split("\0").filter(Boolean).filter((f) => !f.split("/").some((s) => SKIP_DIRS.has(s))).slice(0, 20000);
  else files = walk(dir, 8000);

  const byLang = {};
  const stats = [];
  for (const f of files.slice(0, 6000)) {
    const ext = path.extname(f).slice(1).toLowerCase();
    let st; try { st = fs.statSync(path.join(dir, f)); } catch { continue; }
    const lang = LANGS[ext];
    if (lang) { byLang[lang] = byLang[lang] || { files: 0, kb: 0 }; byLang[lang].files++; byLang[lang].kb += st.size / 1024; }
    stats.push({ f, size: st.size, mtime: st.mtimeMs, code: CODE_EXT.has(ext) });
  }
  const languages = Object.entries(byLang).sort((a, b) => b[1].kb - a[1].kb).slice(0, 8).map(([name, v]) => ({ name, files: v.files, kb: Math.round(v.kb) }));

  const manifests = {};
  const pj = readHead(path.join(dir, "package.json"), 60_000);
  if (pj) {
    try {
      const p = JSON.parse(pj);
      manifests.node = { name: p.name, version: p.version, type: p.type, main: p.main, scripts: p.scripts, dependencies: Object.keys(p.dependencies || {}).slice(0, 25), devDependencies: Object.keys(p.devDependencies || {}).slice(0, 15) };
    } catch { manifests.node = "package.json present but not valid JSON"; }
  }
  for (const [file, key] of [["go.mod", "go"], ["Cargo.toml", "rust"], ["pyproject.toml", "python"], ["requirements.txt", "python_requirements"]]) {
    const h = readHead(path.join(dir, file), 800); if (h) manifests[key] = h.split("\n").slice(0, 14).join("\n");
  }
  const notable = ["README.md", "AGENTS.md", "CLAUDE.md", "Dockerfile", "docker-compose.yml", "Makefile", "tsconfig.json", ".env.example", "app.json"].filter((f) => files.includes(f));
  const ci = files.filter((f) => f.startsWith(".github/workflows/")).slice(0, 10);
  const guide = readHead(path.join(dir, "AGENTS.md"), 1500) || readHead(path.join(dir, "CLAUDE.md"), 1500);
  const readme = readHead(path.join(dir, "README.md"), 900);

  const topDirs = {};
  for (const f of files) { const parts = f.split("/"); const key = parts.length > 1 ? parts.slice(0, Math.min(parts.length - 1, maxDepth)).join("/") : "."; topDirs[key] = (topDirs[key] || 0) + 1; }
  const tree = Object.entries(topDirs).sort((a, b) => (a[0] === "." ? -1 : b[0] === "." ? 1 : a[0].localeCompare(b[0]))).slice(0, maxEntries).map(([d, n]) => `${d}/  (${n} files)`);

  const recent = [...stats].sort((a, b) => b.mtime - a.mtime).slice(0, 10).map((s) => ({ file: s.f, modified: new Date(s.mtime).toISOString() }));
  const largest = stats.filter((s) => s.code).sort((a, b) => b.size - a.size).slice(0, 10).map((s) => ({ file: s.f, kb: Math.round(s.size / 1024) }));

  let gitInfo = null;
  if (gitRoot) {
    const status = (await run("git", ["status", "--short"], dir)).split("\n").filter(Boolean);
    gitInfo = { root: path.basename(gitRoot), branch: (await run("git", ["branch", "--show-current"], dir)).trim(), dirty_files: status.length, recent_commits: (await run("git", ["log", "--oneline", "-n", "6"], dir)).split("\n").filter(Boolean) };
  }
  return { path: path.basename(dir), total_files: files.length, languages, manifests, notable_files: notable, ci_workflows: ci, agent_guide: guide, readme_start: readme, directories: tree, recently_modified: recent, largest_source_files: largest, git: gitInfo };
}

export function registerInsight(mcp, d) {
  const { z, textResult, workspaceRoot, safePath, ROOTS } = d;

  mcp.registerTool("system_info", {
    description: "Server health at a glance: CPU cores and load, memory, disk space for each workspace, top processes by CPU and memory (names only), uptime and background process count.",
    inputSchema: {},
  }, async () => {
    const cpus = os.cpus();
    const total = os.totalmem(), free = os.freemem();
    const load = os.loadavg();
    return textResult({
      host: { platform: os.platform(), release: os.release(), arch: os.arch(), uptime_hours: Math.round((os.uptime() / 3600) * 10) / 10 },
      cpu: { cores: cpus.length, model: cpus[0]?.model, load_avg: load.map((n) => Math.round(n * 100) / 100), load_pct_of_capacity_1m: pct(load[0], cpus.length) },
      memory: { total_gb: gb(total), free_gb: gb(free), used_pct: pct(total - free, total) },
      disks: disks(["/", ...ROOTS]),
      top_by_cpu: await topProcesses("-pcpu"),
      top_by_memory: await topProcesses("-rss"),
      mcp_server: { node: process.version, rss_mb: Math.round(process.memoryUsage().rss / 1048576), uptime_minutes: Math.round(process.uptime() / 60) },
      background_processes: procSummary().filter((p) => p.status === "running").length,
    });
  });

  mcp.registerTool("project_map", {
    description: "Orientation for a project folder in one call: languages, manifests (package.json scripts and deps, go.mod, pyproject...), notable files, CI workflows, directory outline with file counts, recently modified and largest source files, README/AGENTS.md excerpts, git branch and recent commits. Honors .gitignore.",
    inputSchema: { workspace: z.string(), path: z.string().optional(), max_depth: z.number().int().min(1).max(5).optional(), max_entries: z.number().int().min(10).max(300).optional() },
  }, async ({ workspace, path: rel, max_depth = 2, max_entries = 80 }) => {
    const root = await workspaceRoot(workspace);
    const dir = rel ? await safePath(root, rel) : root;
    if (!fs.statSync(dir).isDirectory()) throw new Error("path must be a directory");
    return textResult(await buildMap(dir, { maxDepth: max_depth, maxEntries: max_entries }));
  });
}
