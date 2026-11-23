import { execFile } from "node:child_process";
import { promisify } from "node:util";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Checkpoints: cheap snapshots of a git repo's working tree (tracked + untracked, honoring .gitignore),
 * stored as commits under refs/micode/checkpoints/<id>. They never touch your branches, index or working tree.
 * File-editing tools take an automatic checkpoint first (throttled), and restoring takes a pre-restore checkpoint,
 * so every restore is itself undoable.
 */
const execFileP = promisify(execFile);
const REF_PREFIX = "refs/micode/checkpoints/";
const KEEP = Math.max(5, Number(process.env.MICODE_CHECKPOINT_KEEP || 50));
const AUTO_EVERY_MS = Math.max(0, Number(process.env.MICODE_AUTO_CHECKPOINT_SECS ?? 120)) * 1000;
const AUTO_ENABLED = (process.env.MICODE_AUTO_CHECKPOINT || "on").toLowerCase() !== "off";
const IDENT = { GIT_AUTHOR_NAME: "MiCode checkpoint", GIT_AUTHOR_EMAIL: "checkpoint@micode.local", GIT_COMMITTER_NAME: "MiCode checkpoint", GIT_COMMITTER_EMAIL: "checkpoint@micode.local" };

const git = async (cwd, args, extraEnv = {}) => {
  const { stdout } = await execFileP("git", args, { cwd, env: { PATH: process.env.PATH, HOME: process.env.HOME || "/root", GIT_TERMINAL_PROMPT: "0", ...extraEnv }, maxBuffer: 64 * 1024 * 1024, timeout: 90_000 });
  return stdout;
};

async function repoRootOf(dir) {
  try { return (await git(dir, ["rev-parse", "--show-toplevel"])).trim() || null; } catch { return null; }
}

/** Snapshot the working tree into a tree object using a throwaway index. */
async function currentTree(repo) {
  const idx = path.join(os.tmpdir(), `micode-idx-${crypto.randomBytes(6).toString("hex")}`);
  try {
    await git(repo, ["add", "-A", "--", "."], { GIT_INDEX_FILE: idx });
    return (await git(repo, ["write-tree"], { GIT_INDEX_FILE: idx })).trim();
  } finally { fs.rm(idx, { force: true }, () => {}); }
}

async function listRefs(repo) {
  let out = "";
  try {
    out = await git(repo, ["for-each-ref", "--sort=-committerdate", "--format=%(refname:strip=3)%09%(committerdate:iso-strict)%09%(contents:subject)%09%(tree)", REF_PREFIX]);
  } catch { return []; }
  return out.split("\n").filter(Boolean).map((l) => { const [id, date, subject, tree] = l.split("\t"); return { id, date, label: (subject || "").replace(/^micode-checkpoint:\s*/, ""), tree }; });
}

async function createCheckpoint(repo, label, kind) {
  const tree = await currentTree(repo);
  const existing = await listRefs(repo);
  if (existing[0]?.tree === tree) return { skipped: true, id: existing[0].id, reason: "working tree identical to the latest checkpoint" };
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..*$/, "").replace("T", "-");
  const id = `${stamp}-${crypto.randomBytes(2).toString("hex")}`;
  const msg = `micode-checkpoint: ${kind}${label ? `: ${label}` : ""}`.slice(0, 200);
  const commit = (await git(repo, ["commit-tree", tree, "-m", msg], IDENT)).trim();
  await git(repo, ["update-ref", `${REF_PREFIX}${id}`, commit]);
  for (const old of (await listRefs(repo)).slice(KEEP)) await git(repo, ["update-ref", "-d", `${REF_PREFIX}${old.id}`]).catch(() => {});
  return { id, label: msg.replace(/^micode-checkpoint:\s*/, ""), tree };
}

function parseNameStatus(raw) {
  const parts = raw.split("\0").filter(Boolean);
  const items = [];
  for (let i = 0; i + 1 < parts.length; i += 2) items.push({ status: parts[i], path: parts[i + 1] });
  return items;
}

async function planRestore(repo, id, only) {
  const ref = `${REF_PREFIX}${id}`;
  try { await git(repo, ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`]); } catch { throw new Error(`No checkpoint '${id}' in this repo. Use checkpoint_list.`); }
  const cur = await currentTree(repo);
  const raw = await git(repo, ["diff", "--name-status", "-z", "--no-renames", cur, `${ref}^{tree}`]);
  let items = parseNameStatus(raw);
  if (only?.length) {
    const prefixes = only.map((p) => { const n = path.posix.normalize(p.replace(/\\/g, "/")); if (n.startsWith("..") || path.isAbsolute(n)) throw new Error(`Path outside the repo: ${p}`); return n.replace(/^\.\/?/, ""); });
    items = items.filter((it) => prefixes.some((pre) => pre === "" || it.path === pre || it.path.startsWith(pre.replace(/\/?$/, "/"))));
  }
  return { ref, recreate: items.filter((i) => i.status === "A").map((i) => i.path), modify: items.filter((i) => i.status === "M" || i.status === "T").map((i) => i.path), remove: items.filter((i) => i.status === "D").map((i) => i.path) };
}

// ---- automatic checkpoints before file-changing tools ----
const MUTATING = new Set(["write_file", "edit_file", "delete_file", "move_path", "apply_patch", "git_checkout", "git_pull"]);
const lastAuto = new Map();

export async function autoCheckpoint(tool, args, d) {
  if (!AUTO_ENABLED || !MUTATING.has(tool) || !args?.workspace) return;
  try {
    const root = await d.workspaceRoot(args.workspace);
    let start = root;
    const rel = args.path || args.source || (tool === "apply_patch" ? (String(args.patch || "").match(/^\+\+\+ [ab]\/(\S+)/m) || [])[1] : null);
    if (rel) { const target = await d.safePath(root, rel); start = path.dirname(target); }
    while (start.length >= root.length && !fs.existsSync(start)) start = path.dirname(start);
    const repo = await repoRootOf(start);
    if (!repo) return;
    const last = lastAuto.get(repo) || 0;
    if (Date.now() - last < AUTO_EVERY_MS) return;
    lastAuto.set(repo, Date.now());
    await createCheckpoint(repo, `before ${tool}${rel ? ` ${rel}` : ""}`, "auto");
  } catch (e) {
    console.error("[checkpoint] auto checkpoint skipped:", String(e.message).split("\n")[0]);
  }
}

export function registerCheckpoints(mcp, d) {
  const { z, textResult, workspaceRoot, safePath } = d;

  async function resolveRepo(workspace, rel) {
    const root = await workspaceRoot(workspace);
    const dir = rel ? await safePath(root, rel) : root;
    const repo = await repoRootOf(dir);
    if (repo) return repo;
    const found = [];
    try { for (const e of fs.readdirSync(root, { withFileTypes: true })) if (e.isDirectory() && fs.existsSync(path.join(root, e.name, ".git"))) found.push(e.name); } catch { /* ignore */ }
    throw new Error(`'${rel || "."}' is not inside a git repository.${found.length ? ` Repos here: ${found.slice(0, 20).join(", ")} - pass one as 'path'.` : ""}`);
  }
  const common = { workspace: z.string(), path: z.string().optional() };

  mcp.registerTool("checkpoint_create", {
    description: "Snapshot a git repo's working tree (including untracked, non-ignored files) so it can be restored later. Does not change branches, the index or files. Edits made through file tools are checkpointed automatically; use this before risky shell commands.",
    inputSchema: { ...common, label: z.string().max(120).optional() },
  }, async ({ workspace, path: rel, label }) => {
    const repo = await resolveRepo(workspace, rel);
    return textResult({ repo: path.basename(repo), ...(await createCheckpoint(repo, label || "", "manual")) });
  });

  mcp.registerTool("checkpoint_list", {
    description: "List checkpoints for a git repo, newest first.",
    inputSchema: { ...common, limit: z.number().int().min(1).max(100).optional() },
  }, async ({ workspace, path: rel, limit = 20 }) => {
    const repo = await resolveRepo(workspace, rel);
    return textResult({ repo: path.basename(repo), checkpoints: (await listRefs(repo)).slice(0, limit).map(({ id, date, label }) => ({ id, date, label })) });
  });

  mcp.registerTool("checkpoint_diff", {
    description: "Show what changed in the working tree since a checkpoint (file list and stats, including new and deleted files).",
    inputSchema: { ...common, id: z.string() },
  }, async ({ workspace, path: rel, id }) => {
    const repo = await resolveRepo(workspace, rel);
    const ref = `${REF_PREFIX}${id}`;
    try { await git(repo, ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`]); } catch { throw new Error(`No checkpoint '${id}'.`); }
    const cur = await currentTree(repo);
    const stat = await git(repo, ["diff", "--stat", "--no-color", `${ref}^{tree}`, cur]);
    return textResult({ since: id, changes: stat.trim() || "(no changes since this checkpoint)" });
  });

  mcp.registerTool("checkpoint_restore", {
    description: "Restore files to a checkpoint: modified files are reverted, deleted files are re-created, and files created since the checkpoint are removed. Optional 'paths' limits it to some files/folders. Use dry_run=true to preview. A pre-restore checkpoint is taken first, so the restore can be undone.",
    inputSchema: { ...common, id: z.string(), paths: z.array(z.string()).max(200).optional(), dry_run: z.boolean().optional() },
  }, async ({ workspace, path: rel, id, paths, dry_run = false }) => {
    const repo = await resolveRepo(workspace, rel);
    const plan = await planRestore(repo, id, paths);
    const summary = { recreate: plan.recreate.length, revert: plan.modify.length, remove: plan.remove.length };
    const sample = (a) => a.slice(0, 50);
    if (dry_run) return textResult({ dry_run: true, would: summary, recreate: sample(plan.recreate), revert: sample(plan.modify), remove: sample(plan.remove) });
    if (!summary.recreate && !summary.revert && !summary.remove) return textResult({ restored: 0, note: "Working tree already matches the checkpoint." });
    const safety = await createCheckpoint(repo, `before restoring ${id}`, "pre-restore");
    const toWrite = [...plan.recreate, ...plan.modify];
    for (let i = 0; i < toWrite.length; i += 200) await git(repo, ["restore", `--source=${plan.ref}`, "--worktree", "--", ...toWrite.slice(i, i + 200)]);
    let removed = 0;
    for (const p of plan.remove) {
      const abs = path.resolve(repo, p);
      if (!abs.startsWith(repo + path.sep)) continue;
      try { if (!fs.lstatSync(abs).isDirectory()) { fs.unlinkSync(abs); removed++; } } catch { /* already gone */ }
    }
    return textResult({ restored: toWrite.length, removed, undo_with: safety.id || "(nothing to undo: tree was identical to a previous checkpoint)" });
  });
}
