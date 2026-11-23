import crypto from "node:crypto";

/**
 * OAuth 2.1 authorization server + resource-server guard for the MiCode MCP endpoint.
 *
 * One pre-registered confidential client per platform, each with its own MCP URL:
 *   https://<host>/chatgpt/mcp   https://<host>/gemini/mcp   https://<host>/cloude/mcp
 *
 * Flow: authorization_code + PKCE (S256) with client_id/client_secret at the token endpoint,
 * plus refresh_token. The owner approves each authorization with MICODE_OWNER_PASSWORD.
 * Tokens are HMAC-signed and audience-bound to a single platform, so they survive restarts
 * and a ChatGPT token cannot be replayed against /gemini/mcp or /cloude/mcp.
 */

const PLATFORMS = ["chatgpt", "gemini", "cloude"];
const SCOPE = "mcp";
const CODE_TTL = 300; // seconds
const ACCESS_TTL = 3600;
const REFRESH_TTL = 30 * 86400;

// Exact-match redirect allowlists. Extend per platform with MICODE_<PLATFORM>_REDIRECT_URIS (comma separated).
const DEFAULT_REDIRECTS = {
  chatgpt: ["https://chatgpt.com/connector/oauth/BRwWk1XEwrA1"],
  gemini: [], // set MICODE_GEMINI_REDIRECT_URIS to the callback your Gemini client shows you
  cloude: ["https://claude.ai/api/mcp/auth_callback", "https://claude.com/api/mcp/auth_callback"],
};

const env = process.env;
const PUBLIC_URL = (env.MICODE_PUBLIC_URL || "").replace(/\/+$/, "");
const SIGNING_KEY = env.MICODE_TOKEN_SECRET || "";
const OWNER_PASSWORD = env.MICODE_OWNER_PASSWORD || "";
const TRUST_PROXY = env.MICODE_TRUST_PROXY === "1";

const clients = new Map();
for (const name of PLATFORMS) {
  const P = name.toUpperCase();
  const id = env[`MICODE_${P}_CLIENT_ID`];
  const secret = env[`MICODE_${P}_CLIENT_SECRET`];
  if (!id || !secret) continue;
  const extra = (env[`MICODE_${P}_REDIRECT_URIS`] || "").split(",").map((s) => s.trim()).filter(Boolean);
  clients.set(name, { name, id, secret, redirects: new Set([...DEFAULT_REDIRECTS[name], ...extra]) });
}

const missing = [];
if (!PUBLIC_URL) missing.push("MICODE_PUBLIC_URL");
if (SIGNING_KEY.length < 32) missing.push("MICODE_TOKEN_SECRET (min 32 chars)");
if (OWNER_PASSWORD.length < 12) missing.push("MICODE_OWNER_PASSWORD (min 12 chars)");
if (!clients.size) missing.push("at least one MICODE_<PLATFORM>_CLIENT_ID/_CLIENT_SECRET pair");
export const oauthReady = missing.length === 0;

export function oauthSummary() {
  return { ready: oauthReady, platforms: [...clients.keys()], missing };
}

// ---------- small utilities ----------
const b64u = (buf) => Buffer.from(buf).toString("base64url");
const sha = (s) => crypto.createHash("sha256").update(s).digest();
const safeEqual = (a, b) => crypto.timingSafeEqual(sha(String(a)), sha(String(b)));
const rand = () => crypto.randomBytes(16).toString("hex");
const nowSec = () => Math.floor(Date.now() / 1000);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const issuerOf = (n) => `${PUBLIC_URL}/${n}`;
const resourceOf = (n) => `${PUBLIC_URL}/${n}/mcp`;
const prmUrlOf = (n) => `${PUBLIC_URL}/.well-known/oauth-protected-resource/${n}/mcp`;

// ---------- sliding-window counters ----------
const attempts = new Map();
function recent(key, windowMs) {
  const t = Date.now();
  const a = (attempts.get(key) || []).filter((x) => t - x < windowMs);
  attempts.set(key, a);
  return a;
}
const over = (key, limit, windowMs) => recent(key, windowMs).length >= limit;
const record = (key, windowMs) => { recent(key, windowMs).push(Date.now()); };

// ---------- signed tokens ----------
function sign(payload) {
  const body = b64u(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", SIGNING_KEY).update(body).digest("base64url");
  return `${body}.${sig}`;
}
function verify(token, typ, aud) {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const expected = crypto.createHmac("sha256", SIGNING_KEY).update(parts[0]).digest();
  const given = Buffer.from(parts[1], "base64url");
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  let p;
  try { p = JSON.parse(Buffer.from(parts[0], "base64url").toString()); } catch { return null; }
  if (!p || p.typ !== typ || p.aud !== aud || typeof p.exp !== "number" || p.exp < nowSec()) return null;
  return p;
}

// Authorization codes are single use. Remembered until they would have expired anyway.
const usedCodes = new Map();
setInterval(() => {
  const t = nowSec();
  for (const [jti, exp] of usedCodes) if (exp < t) usedCodes.delete(jti);
  for (const [k, a] of attempts) { if (!a.length || Date.now() - a[a.length - 1] > 3_600_000) attempts.delete(k); }
}, 300_000).unref();

function issueTokens(client) {
  const iat = nowSec();
  const base = { aud: client.name, cid: client.id, scope: SCOPE, iat };
  return {
    access_token: sign({ ...base, typ: "access", jti: rand(), exp: iat + ACCESS_TTL }),
    token_type: "Bearer",
    expires_in: ACCESS_TTL,
    refresh_token: sign({ ...base, typ: "refresh", jti: rand(), exp: iat + REFRESH_TTL }),
    scope: SCOPE,
  };
}

// ---------- http helpers ----------
function clientIp(req) {
  if (TRUST_PROXY) {
    const h = req.headers["cf-connecting-ip"] || String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
    if (h) return String(h);
  }
  return req.socket.remoteAddress || "unknown";
}
function sendJson(res, status, data, headers = {}) {
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store", pragma: "no-cache", ...headers });
  res.end(JSON.stringify(data));
}
function sendHtml(res, status, html) {
  res.writeHead(status, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
    "x-frame-options": "DENY",
    "referrer-policy": "no-referrer",
    "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'",
  });
  res.end(html);
}
function redirectTo(res, uri, params) {
  const u = new URL(uri);
  for (const [k, v] of Object.entries(params)) if (v != null) u.searchParams.set(k, String(v));
  res.writeHead(302, { location: u.toString(), "cache-control": "no-store" });
  res.end();
}
async function readForm(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 16_384) throw new Error("body too large");
  }
  if ((req.headers["content-type"] || "").includes("json")) return JSON.parse(raw || "{}");
  return Object.fromEntries(new URLSearchParams(raw));
}

const STYLE = `body{font:16px/1.5 system-ui,sans-serif;margin:0;padding:24px;background:#0f1115;color:#e8eaed}
main{max-width:420px;margin:8vh auto}h1{font-size:1.3rem}code{background:#1c1f26;padding:2px 6px;border-radius:4px}
input[type=password]{width:100%;box-sizing:border-box;padding:12px;margin:8px 0 16px;border-radius:8px;border:1px solid #3a3f4b;background:#1c1f26;color:inherit;font-size:1rem}
button{padding:12px 20px;border-radius:8px;border:0;font-size:1rem;margin-right:8px}.ok{background:#4f8cff;color:#fff}.no{background:#2a2e38;color:#e8eaed}.err{color:#ff8a8a}`;
const shell = (title, inner) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>${STYLE}</style></head><body><main>${inner}</main></body></html>`;

function consentPage(client, q, message) {
  const fields = ["client_id", "redirect_uri", "response_type", "code_challenge", "code_challenge_method", "state", "resource"]
    .filter((k) => q[k] != null)
    .map((k) => `<input type="hidden" name="${k}" value="${esc(q[k])}">`)
    .join("");
  const host = new URL(q.redirect_uri).host;
  return shell("Authorize MiCode", `<h1>Authorize ${esc(client.name)} to use MiCode</h1>
<p>This will give <code>${esc(host)}</code> access to files, git and commands on this server.</p>
${message ? `<p class="err">${esc(message)}</p>` : ""}
<form method="post" autocomplete="off">${fields}
<label>Owner password<input type="password" name="owner_password" autocomplete="current-password" required></label>
<button class="ok" type="submit" name="decision" value="approve">Approve</button>
<button class="no" type="submit" name="decision" value="deny" formnovalidate>Deny</button></form>`);
}
const errorPage = (res, status, msg) => sendHtml(res, status, shell("MiCode authorization error", `<h1>Authorization error</h1><p class="err">${esc(msg)}</p>`));

// ---------- request validation ----------
function checkAuthRequest(client, q) {
  // client_id / redirect_uri problems must never redirect.
  if (q.client_id !== client.id) return { fatal: "Unknown client_id." };
  if (typeof q.redirect_uri !== "string" || !client.redirects.has(q.redirect_uri)) return { fatal: "redirect_uri is not registered for this client." };
  if (q.response_type !== "code") return { error: "unsupported_response_type", desc: "response_type must be code" };
  if (typeof q.code_challenge !== "string" || !/^[A-Za-z0-9_-]{43,128}$/.test(q.code_challenge) || q.code_challenge_method !== "S256")
    return { error: "invalid_request", desc: "PKCE with code_challenge_method=S256 is required" };
  if (q.resource && !String(q.resource).replace(/\/+$/, "").startsWith(issuerOf(client.name)))
    return { error: "invalid_target", desc: "resource does not belong to this server" };
  return { ok: true };
}

// ---------- endpoints ----------
async function handleAuthorize(req, res, url, client) {
  let q;
  if (req.method === "GET") q = Object.fromEntries(url.searchParams);
  else if (req.method === "POST") {
    try { q = await readForm(req); } catch { return errorPage(res, 400, "Malformed request."); }
  } else return sendJson(res, 405, { error: "method_not_allowed" }, { allow: "GET, POST" });

  const chk = checkAuthRequest(client, q);
  if (chk.fatal) return errorPage(res, 400, chk.fatal);
  if (chk.error) return redirectTo(res, q.redirect_uri, { error: chk.error, error_description: chk.desc, state: q.state });
  if (req.method === "GET") return sendHtml(res, 200, consentPage(client, q));

  if (q.decision === "deny") return redirectTo(res, q.redirect_uri, { error: "access_denied", state: q.state });

  const key = `pw:${clientIp(req)}`;
  const WINDOW = 15 * 60_000;
  if (over(key, 8, WINDOW)) return sendHtml(res, 429, consentPage(client, q, "Too many attempts. Try again later."));
  if (!q.owner_password || !safeEqual(q.owner_password, OWNER_PASSWORD)) {
    record(key, WINDOW);
    return sendHtml(res, 401, consentPage(client, q, "Incorrect owner password."));
  }
  const iat = nowSec();
  const code = sign({ typ: "code", aud: client.name, cid: client.id, ru: q.redirect_uri, cc: q.code_challenge, scope: SCOPE, jti: rand(), iat, exp: iat + CODE_TTL });
  return redirectTo(res, q.redirect_uri, { code, state: q.state });
}

async function handleToken(req, res, client) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "method_not_allowed" }, { allow: "POST" });
  const ipKey = `tok:${clientIp(req)}`;
  if (over(ipKey, 60, 60_000)) return sendJson(res, 429, { error: "slow_down" });
  record(ipKey, 60_000);

  let form;
  try { form = await readForm(req); } catch { return sendJson(res, 400, { error: "invalid_request" }); }

  let id, secret;
  const auth = req.headers.authorization || "";
  if (/^basic /i.test(auth)) {
    try {
      const decoded = Buffer.from(auth.slice(6).trim(), "base64").toString();
      const i = decoded.indexOf(":");
      id = decodeURIComponent(decoded.slice(0, i));
      secret = decodeURIComponent(decoded.slice(i + 1));
    } catch { /* falls through to invalid_client */ }
  } else {
    id = form.client_id;
    secret = form.client_secret;
  }
  if (!id || !secret || id !== client.id || !safeEqual(secret, client.secret))
    return sendJson(res, 401, { error: "invalid_client" }, { "www-authenticate": 'Basic realm="micode"' });

  if (form.grant_type === "authorization_code") {
    const c = verify(form.code, "code", client.name);
    if (!c || c.cid !== client.id || usedCodes.has(c.jti)) return sendJson(res, 400, { error: "invalid_grant" });
    usedCodes.set(c.jti, c.exp); // burn on first presentation, even if the checks below fail
    if (form.redirect_uri !== c.ru) return sendJson(res, 400, { error: "invalid_grant", error_description: "redirect_uri mismatch" });
    const v = form.code_verifier;
    if (typeof v !== "string" || !/^[A-Za-z0-9\-._~]{43,128}$/.test(v) || !safeEqual(b64u(sha(v)), c.cc))
      return sendJson(res, 400, { error: "invalid_grant", error_description: "PKCE verification failed" });
    return sendJson(res, 200, issueTokens(client));
  }
  if (form.grant_type === "refresh_token") {
    const r = verify(form.refresh_token, "refresh", client.name);
    if (!r || r.cid !== client.id) return sendJson(res, 400, { error: "invalid_grant" });
    return sendJson(res, 200, issueTokens(client));
  }
  return sendJson(res, 400, { error: "unsupported_grant_type" });
}

function metadata(res, name, kind) {
  const cors = { "access-control-allow-origin": "*" };
  if (kind === "resource") {
    return sendJson(res, 200, {
      resource: resourceOf(name),
      authorization_servers: [issuerOf(name)],
      bearer_methods_supported: ["header"],
      scopes_supported: [SCOPE],
    }, cors);
  }
  return sendJson(res, 200, {
    issuer: issuerOf(name),
    authorization_endpoint: `${issuerOf(name)}/oauth/authorize`,
    token_endpoint: `${issuerOf(name)}/oauth/token`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post"],
    scopes_supported: [SCOPE],
  }, cors);
}

/** Handles discovery + authorize + token routes. Returns true when the request was consumed. */
export async function handleOAuth(req, res, url) {
  const p = url.pathname;
  let m, name, kind;
  if ((m = p.match(/^\/\.well-known\/oauth-protected-resource\/(\w+)\/mcp$/))) { name = m[1]; kind = "resource"; }
  else if ((m = p.match(/^\/\.well-known\/(?:oauth-authorization-server|openid-configuration)\/(\w+)$/)) ||
           (m = p.match(/^\/(\w+)\/\.well-known\/(?:oauth-authorization-server|openid-configuration)$/))) { name = m[1]; kind = "server"; }
  else if ((m = p.match(/^\/(\w+)\/oauth\/(authorize|token)$/))) { name = m[1]; kind = m[2]; }
  else return false;

  if (!PLATFORMS.includes(name) || !clients.has(name)) return false; // unknown/unconfigured platform -> 404
  if (!oauthReady) { sendJson(res, 503, { error: "temporarily_unavailable", error_description: "OAuth is not fully configured" }); return true; }
  if (req.method === "OPTIONS" && (kind === "resource" || kind === "server")) {
    res.writeHead(204, { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, OPTIONS", "access-control-allow-headers": "*" });
    res.end();
    return true;
  }
  const client = clients.get(name);
  if (kind === "resource" || kind === "server") {
    if (req.method !== "GET") { sendJson(res, 405, { error: "method_not_allowed" }); return true; }
    metadata(res, name, kind);
  } else if (kind === "authorize") await handleAuthorize(req, res, url, client);
  else await handleToken(req, res, client);
  return true;
}

// ---------- MCP resource guard ----------
export function mcpPlatform(pathname) {
  const m = pathname.match(/^\/(chatgpt|gemini|cloude)\/mcp\/?$/);
  return m ? m[1] : null;
}

export function authenticateMcp(req, name) {
  const client = clients.get(name);
  if (!client) return { ok: false, status: 404 };
  if (!oauthReady) return { ok: false, status: 503 };
  const m = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization || "");
  const claims = m ? verify(m[1], "access", name) : null;
  if (!claims || claims.cid !== client.id) return { ok: false, status: 401, presented: Boolean(m) };
  return { ok: true, subject: `${name}:${claims.cid}` };
}

export function rejectMcp(res, name, auth) {
  if (auth.status === 401) {
    const parts = [`resource_metadata="${prmUrlOf(name)}"`];
    if (auth.presented) parts.push('error="invalid_token"');
    return sendJson(res, 401, { error: "unauthorized" }, { "www-authenticate": `Bearer ${parts.join(", ")}` });
  }
  return sendJson(res, auth.status, { error: auth.status === 404 ? "Not found" : "temporarily_unavailable" });
}

export const rateLimitKey = (req, auth) => (auth?.subject ? `mcp:${auth.subject}` : `mcp:${clientIp(req)}`);
export const isRateLimited = (key, limit = 300, windowMs = 60_000) => {
  if (over(`rl:${key}`, limit, windowMs)) return true;
  record(`rl:${key}`, windowMs);
  return false;
};
