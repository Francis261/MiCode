import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { redactString } from "./audit.js";

/**
 * GitHub tools (pull requests, issues, Actions) over the REST API.
 * Needs MICODE_GITHUB_TOKEN (fine-grained token: Contents, Pull requests, Issues, Actions on the repos you want).
 * The token stays on the server and is never returned in tool output. Set it with ./manage.sh github.
 */
const execFileP = promisify(execFile);
const API = (process.env.MICODE_GITHUB_API_URL || "https://api.github.com").replace(/\/+$/, "");
const TOKEN = process.env.MICODE_GITHUB_TOKEN || "";
export const githubConfigured = Boolean(TOKEN);

async function gh(method, route, { body, text = false } = {}) {
  const res = await fetch(`${API}${route}`, {
    method,
    headers: { authorization: `Bearer ${TOKEN}`, accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", "user-agent": "micode-remote", ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(25_000),
  });
  const raw = await res.text();
  if (!res.ok) {
    let msg = raw.slice(0, 300);
    try { const j = JSON.parse(raw); msg = [j.message, ...(j.errors || []).map((e) => e.message || JSON.stringify(e))].filter(Boolean).join("; "); } catch { /* not json */ }
    const hint = res.status === 401 ? " (token invalid or expired)" : res.status === 403 ? " (token lacks permission, or rate limited)" : res.status === 404 ? " (not found, or the token cannot see this repo)" : "";
    throw new Error(`GitHub ${res.status}: ${redactString(msg)}${hint}`);
  }
  if (text) return raw;
  return raw ? JSON.parse(raw) : {};
}

const tail = (s, lines, bytes) => { const t = s.split("\n").slice(-lines).join("\n"); return t.length > bytes ? t.slice(t.length - bytes) : t; };

export function registerGithub(mcp, d) {
  if (!githubConfigured) return;
  const { z, textResult, workspaceRoot, safePath } = d;

  async function repoOf({ repo, workspace, path: rel }) {
    if (repo) {
      if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error("repo must look like owner/name");
      return repo;
    }
    if (!workspace) throw new Error("Pass repo (owner/name) or workspace + path of a cloned repo.");
    const root = await workspaceRoot(workspace);
    const dir = rel ? await safePath(root, rel) : root;
    let url = "";
    try { url = (await execFileP("git", ["remote", "get-url", "origin"], { cwd: dir, timeout: 10_000 })).stdout.trim(); } catch { throw new Error("No git remote 'origin' found there. Pass repo as owner/name."); }
    const m = url.match(/github\.com[:/]([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/);
    if (!m) throw new Error(`origin (${url.replace(/\/\/[^@/]+@/, "//")}) is not a GitHub URL. Pass repo as owner/name.`);
    return `${m[1]}/${m[2]}`;
  }
  const where = { repo: z.string().optional(), workspace: z.string().optional(), path: z.string().optional() };
  const user = (u) => u?.login;
  const pr = (p) => ({ number: p.number, title: p.title, state: p.merged_at ? "merged" : p.state, draft: p.draft, author: user(p.user), head: p.head?.ref, base: p.base?.ref, updated: p.updated_at, url: p.html_url });
  const issue = (i) => ({ number: i.number, title: i.title, state: i.state, author: user(i.user), labels: (i.labels || []).map((l) => l.name), comments: i.comments, updated: i.updated_at, url: i.html_url });

  mcp.registerTool("github_repo", {
    description: "GitHub repository summary: description, default branch, visibility, open issues, last push, and recent branches.",
    inputSchema: { ...where },
  }, async (a) => {
    const r = await repoOf(a);
    const [info, branches] = await Promise.all([gh("GET", `/repos/${r}`), gh("GET", `/repos/${r}/branches?per_page=10`)]);
    return textResult({ repo: info.full_name, description: info.description, default_branch: info.default_branch, private: info.private, archived: info.archived, open_issues_and_prs: info.open_issues_count, stars: info.stargazers_count, pushed_at: info.pushed_at, url: info.html_url, branches: branches.map((b) => b.name) });
  });

  mcp.registerTool("github_prs", {
    description: "Pull requests. action=list (state open|closed|all), get (details, changed files, CI check summary), create (title, head, base?, body?, draft?), comment (number, body), merge (number, merge_method merge|squash|rebase; requires owner approval).",
    inputSchema: { action: z.enum(["list", "get", "create", "comment", "merge"]), ...where, number: z.number().int().optional(), state: z.enum(["open", "closed", "all"]).optional(), title: z.string().max(256).optional(), head: z.string().optional(), base: z.string().optional(), body: z.string().max(60000).optional(), draft: z.boolean().optional(), merge_method: z.enum(["merge", "squash", "rebase"]).optional(), limit: z.number().int().min(1).max(50).optional() },
  }, async (a) => {
    const r = await repoOf(a);
    const need = (k) => { if (a[k] === undefined) throw new Error(`${k} is required for action=${a.action}`); return a[k]; };
    switch (a.action) {
      case "list": return textResult((await gh("GET", `/repos/${r}/pulls?state=${a.state || "open"}&per_page=${a.limit || 20}`)).map(pr));
      case "get": {
        const n = need("number");
        const [p, files] = await Promise.all([gh("GET", `/repos/${r}/pulls/${n}`), gh("GET", `/repos/${r}/pulls/${n}/files?per_page=60`)]);
        let checks = null;
        try {
          const cr = await gh("GET", `/repos/${r}/commits/${p.head.sha}/check-runs?per_page=50`);
          const counts = {}; for (const c of cr.check_runs) counts[c.conclusion || c.status] = (counts[c.conclusion || c.status] || 0) + 1;
          checks = { counts, failing: cr.check_runs.filter((c) => ["failure", "timed_out", "cancelled"].includes(c.conclusion)).map((c) => c.name) };
        } catch { /* checks not visible to this token */ }
        return textResult({ ...pr(p), body: (p.body || "").slice(0, 3000), mergeable: p.mergeable, mergeable_state: p.mergeable_state, commits: p.commits, additions: p.additions, deletions: p.deletions, checks, files: files.map((f) => ({ file: f.filename, status: f.status, additions: f.additions, deletions: f.deletions })) });
      }
      case "create": {
        let base = a.base;
        if (!base) base = (await gh("GET", `/repos/${r}`)).default_branch;
        return textResult(pr(await gh("POST", `/repos/${r}/pulls`, { body: { title: need("title"), head: need("head"), base, body: a.body || "", draft: Boolean(a.draft) } })));
      }
      case "comment": { const c = await gh("POST", `/repos/${r}/issues/${need("number")}/comments`, { body: { body: need("body") } }); return textResult({ commented: true, url: c.html_url }); }
      case "merge": { const m = await gh("PUT", `/repos/${r}/pulls/${need("number")}/merge`, { body: { merge_method: a.merge_method || "squash" } }); return textResult({ merged: m.merged, message: m.message, sha: m.sha }); }
      default: throw new Error("unknown action");
    }
  });

  mcp.registerTool("github_issues", {
    description: "Issues. action=list (state, labels), get (with latest comments), create (title, body?, labels?), comment (number, body), close (number).",
    inputSchema: { action: z.enum(["list", "get", "create", "comment", "close"]), ...where, number: z.number().int().optional(), state: z.enum(["open", "closed", "all"]).optional(), labels: z.array(z.string()).max(10).optional(), title: z.string().max(256).optional(), body: z.string().max(60000).optional(), limit: z.number().int().min(1).max(50).optional() },
  }, async (a) => {
    const r = await repoOf(a);
    const need = (k) => { if (a[k] === undefined) throw new Error(`${k} is required for action=${a.action}`); return a[k]; };
    switch (a.action) {
      case "list": {
        const q = new URLSearchParams({ state: a.state || "open", per_page: String(a.limit || 20) });
        if (a.labels?.length) q.set("labels", a.labels.join(","));
        return textResult((await gh("GET", `/repos/${r}/issues?${q}`)).filter((i) => !i.pull_request).map(issue));
      }
      case "get": {
        const n = need("number");
        const [i, comments] = await Promise.all([gh("GET", `/repos/${r}/issues/${n}`), gh("GET", `/repos/${r}/issues/${n}/comments?per_page=15`)]);
        return textResult({ ...issue(i), body: (i.body || "").slice(0, 4000), latest_comments: comments.map((c) => ({ author: user(c.user), at: c.created_at, body: (c.body || "").slice(0, 800) })) });
      }
      case "create": return textResult(issue(await gh("POST", `/repos/${r}/issues`, { body: { title: need("title"), body: a.body || "", labels: a.labels || [] } })));
      case "comment": { const c = await gh("POST", `/repos/${r}/issues/${need("number")}/comments`, { body: { body: need("body") } }); return textResult({ commented: true, url: c.html_url }); }
      case "close": return textResult(issue(await gh("PATCH", `/repos/${r}/issues/${need("number")}`, { body: { state: "closed" } })));
      default: throw new Error("unknown action");
    }
  });

  mcp.registerTool("github_actions", {
    description: "GitHub Actions. action=runs (recent workflow runs; filter branch/status), logs (run_id: failed jobs with failing steps and the tail of their logs), rerun (run_id: re-run failed jobs), dispatch (workflow file name or id, ref, inputs?).",
    inputSchema: { action: z.enum(["runs", "logs", "rerun", "dispatch"]), ...where, run_id: z.number().int().optional(), branch: z.string().optional(), status: z.string().optional(), workflow: z.string().optional(), ref: z.string().optional(), inputs: z.record(z.string()).optional(), limit: z.number().int().min(1).max(30).optional() },
  }, async (a) => {
    const r = await repoOf(a);
    const need = (k) => { if (a[k] === undefined) throw new Error(`${k} is required for action=${a.action}`); return a[k]; };
    switch (a.action) {
      case "runs": {
        const q = new URLSearchParams({ per_page: String(a.limit || 10) });
        if (a.branch) q.set("branch", a.branch);
        if (a.status) q.set("status", a.status);
        const j = await gh("GET", `/repos/${r}/actions/runs?${q}`);
        return textResult(j.workflow_runs.map((w) => ({ id: w.id, workflow: w.name, status: w.status, conclusion: w.conclusion, branch: w.head_branch, event: w.event, sha: (w.head_sha || "").slice(0, 7), created: w.created_at, url: w.html_url })));
      }
      case "logs": {
        const id = need("run_id");
        const jobs = (await gh("GET", `/repos/${r}/actions/runs/${id}/jobs?per_page=50`)).jobs;
        const failed = jobs.filter((j) => ["failure", "timed_out", "cancelled"].includes(j.conclusion));
        const out = [];
        for (const j of failed.slice(0, 4)) {
          let log = "";
          try { log = tail(await gh("GET", `/repos/${r}/actions/jobs/${j.id}/logs`, { text: true }), 120, 12_000); } catch (e) { log = `(could not fetch logs: ${e.message})`; }
          out.push({ job: j.name, conclusion: j.conclusion, failing_steps: (j.steps || []).filter((s) => s.conclusion === "failure").map((s) => s.name), log_tail: redactString(log) });
        }
        return textResult({ run_id: id, jobs: jobs.map((j) => ({ name: j.name, status: j.status, conclusion: j.conclusion })), failed: out.length ? out : "No failed jobs in this run." });
      }
      case "rerun": await gh("POST", `/repos/${r}/actions/runs/${need("run_id")}/rerun-failed-jobs`); return textResult({ rerun_requested: true });
      case "dispatch": await gh("POST", `/repos/${r}/actions/workflows/${encodeURIComponent(need("workflow"))}/dispatches`, { body: { ref: need("ref"), inputs: a.inputs || {} } }); return textResult({ dispatched: true });
      default: throw new Error("unknown action");
    }
  });
}
