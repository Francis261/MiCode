import { adminKit, oauthReady } from "./oauth.js";
import { listPending, listDecided, decide, approvalsMode } from "./approvals.js";
import { readAudit } from "./audit.js";
import { procSummary } from "./procs.js";

/**
 * Owner admin page: approve or deny risky actions, watch recent activity and background processes.
 * Login with MICODE_OWNER_PASSWORD; a signed, HttpOnly, SameSite=Strict cookie lasts 30 minutes.
 */
const { clientIp, over, record, esc, sendHtml, readForm, shell, sign, verify, nowSec, publicUrl, ownerPasswordOk } = adminKit;
const COOKIE = "micode_admin";
const SESSION_SECS = 1800;
const secure = publicUrl.startsWith("https://");

function session(req) {
  const raw = (req.headers.cookie || "").split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`));
  if (!raw) return null;
  try { return verify(decodeURIComponent(raw.slice(COOKIE.length + 1)), "admin", "admin"); } catch { return null; }
}
function redirect(res, location, cookie) {
  res.writeHead(303, { location, "cache-control": "no-store", ...(cookie ? { "set-cookie": cookie } : {}) });
  res.end();
}
const cookieFor = (token, maxAge) => `${COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/admin; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return false;
  try { return new URL(origin).origin === new URL(publicUrl || `http://${req.headers.host}`).origin; } catch { return false; }
}

const CSS = `<style>main{max-width:760px!important}.card{border:1px solid #2a2e38;border-radius:10px;padding:12px;margin:12px 0}
pre{white-space:pre-wrap;word-break:break-all;background:#1c1f26;padding:8px;border-radius:6px;margin:8px 0}
table{width:100%;border-collapse:collapse;font-size:.85rem}td{padding:4px 6px;border-bottom:1px solid #20242c;vertical-align:top;word-break:break-all}
small,.dim{color:#8b93a1}.bad{color:#ff8a8a}.good{color:#7ee787}h2{font-size:1.05rem;margin:22px 0 6px}</style>`;

const ago = (ms) => { const s = Math.max(0, Math.round((Date.now() - ms) / 1000)); return s < 90 ? `${s}s ago` : s < 5400 ? `${Math.round(s / 60)}m ago` : `${Math.round(s / 3600)}h ago`; };
const brief = (e) => String(e.args?.command ?? e.args?.path ?? e.args?.url ?? e.args?.action ?? e.args?.name ?? "").slice(0, 90);

function loginPage(msg) {
  return shell("MiCode admin", `<h1>MiCode admin</h1>${msg ? `<p class="err">${esc(msg)}</p>` : ""}
<form method="post" action="/admin/login"><label>Owner password<input type="password" name="owner_password" autocomplete="current-password" required></label>
<button class="ok" type="submit">Sign in</button></form>`);
}

function dashboard() {
  const pending = listPending();
  const decided = listDecided(5);
  const acts = readAudit({ limit: 40 }).reverse();
  const procs = procSummary();
  const pend = pending.length
    ? pending.map((r) => `<div class="card"><b>${esc(r.tool)}</b> &middot; ${esc(r.reason)}<pre>${esc(r.summary)}</pre>
<small>${ago(r.createdAt)} &middot; ${esc(r.subject)}</small>
<form method="post" action="/admin/decide"><input type="hidden" name="id" value="${esc(r.id)}">
<button class="ok" name="decision" value="approve">Approve</button><button class="no" name="decision" value="deny">Deny</button></form></div>`).join("")
    : `<p class="dim">Nothing waiting for approval.</p>`;
  const recentDecisions = decided.length
    ? `<p class="dim">${decided.map((r) => `${esc(r.tool)} ${esc(r.status)}`).join(" &middot; ")}</p>` : "";
  const procRows = procs.length
    ? `<table>${procs.map((p) => `<tr><td>${esc(p.id)}${p.name ? ` (${esc(p.name)})` : ""}</td><td class="${p.status === "running" ? "good" : "dim"}">${esc(p.status)}</td><td>${esc(p.command)}</td></tr>`).join("")}</table>`
    : `<p class="dim">No background processes.</p>`;
  const rows = acts.length
    ? `<table>${acts.map((e) => `<tr><td class="dim">${esc(new Date(e.ts).toISOString().slice(11, 19))}</td><td>${esc(e.tool)}</td><td class="${e.ok ? "good" : "bad"}">${e.ok ? "ok" : "fail"}</td><td>${esc(brief(e))}${e.ok ? "" : `<br><span class="bad">${esc(String(e.error || "").slice(0, 120))}</span>`}</td></tr>`).join("")}</table>`
    : `<p class="dim">No activity yet.</p>`;
  return shell("MiCode admin", `${CSS}<meta http-equiv="refresh" content="15"><h1>MiCode admin</h1>
<p class="dim">Approval mode: <b>${esc(approvalsMode())}</b> &middot; refreshes every 15s</p>
<h2>Approvals (${pending.length})</h2>${pend}${recentDecisions}
<h2>Background processes</h2>${procRows}
<h2>Recent activity</h2>${rows}
<form method="post" action="/admin/logout"><button class="no" type="submit">Sign out</button></form>`);
}

export async function handleAdmin(req, res, url) {
  const p = url.pathname;
  if (p !== "/admin" && !p.startsWith("/admin/")) return false;
  if (!oauthReady) { sendHtml(res, 503, shell("MiCode admin", "<p>OAuth is not fully configured, so the admin page is disabled.</p>")); return true; }

  if (p === "/admin" && req.method === "GET") { sendHtml(res, 200, session(req) ? dashboard() : loginPage()); return true; }

  if (p === "/admin/login" && req.method === "POST") {
    if (!sameOrigin(req)) { sendHtml(res, 403, loginPage("Cross-origin request refused.")); return true; }
    const key = `adm:${clientIp(req)}`;
    if (over(key, 8, 15 * 60_000)) { sendHtml(res, 429, loginPage("Too many attempts. Try again later.")); return true; }
    let form; try { form = await readForm(req); } catch { sendHtml(res, 400, loginPage("Malformed request.")); return true; }
    if (!ownerPasswordOk(form.owner_password)) { record(key, 15 * 60_000); sendHtml(res, 401, loginPage("Incorrect password.")); return true; }
    const t = nowSec();
    redirect(res, "/admin", cookieFor(sign({ typ: "admin", aud: "admin", iat: t, exp: t + SESSION_SECS }), SESSION_SECS));
    return true;
  }

  if (p === "/admin/logout" && req.method === "POST") {
    if (!sameOrigin(req)) { sendHtml(res, 403, loginPage("Cross-origin request refused.")); return true; }
    redirect(res, "/admin", cookieFor("", 0));
    return true;
  }

  if (p === "/admin/decide" && req.method === "POST") {
    if (!sameOrigin(req)) { sendHtml(res, 403, loginPage("Cross-origin request refused.")); return true; }
    if (!session(req)) { sendHtml(res, 401, loginPage("Session expired - sign in again.")); return true; }
    let form; try { form = await readForm(req); } catch { sendHtml(res, 400, loginPage("Malformed request.")); return true; }
    decide(String(form.id || ""), form.decision === "approve");
    redirect(res, "/admin");
    return true;
  }

  sendHtml(res, 404, shell("MiCode admin", "<p>Not found.</p>"));
  return true;
}
