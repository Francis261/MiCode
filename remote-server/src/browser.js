import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import dns from "node:dns/promises";
import net from "node:net";
import { DATA_DIR } from "./audit.js";

/**
 * Browser automation with headless Chromium (Playwright). Lets the agent open a page (e.g. a dev server on localhost),
 * read it, click and type, take screenshots and read console/network errors.
 * Offered only when playwright-core and a Chromium build are installed (see ./manage.sh browser).
 */
let pw = null;
try { pw = await import("playwright-core"); } catch { /* optional dependency not installed */ }

let chromiumPath = null;
try { chromiumPath = pw?.chromium?.executablePath?.() || null; } catch { /* not downloaded */ }
export const browserAvailable = Boolean(pw && chromiumPath && fs.existsSync(chromiumPath));

const MAX_SESSIONS = 3;
const IDLE_MS = 10 * 60_000;
const SHOTS = path.join(DATA_DIR, "screenshots");

let browser = null;
let browserLaunch = null;
const sessions = new Map();
let counter = 0;

async function getBrowser() {
  if (browser && browser.isConnected()) return browser;
  if (browserLaunch) return browserLaunch;
  browserLaunch = pw.chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] })
    .then((instance) => {
      browser = instance;
      instance.on("disconnected", () => {
        if (browser === instance) {
          browser = null;
          sessions.clear();
        }
      });
      return instance;
    })
    .finally(() => { browserLaunch = null; });
  return browserLaunch;
}

async function closeSession(s) {
  if (!s || s.closing) return;
  s.closing = true;
  sessions.delete(s.id);
  try { await s.context.close(); } catch { /* already closed */ }
  if (!sessions.size && browser) {
    const b = browser;
    browser = null;
    try { await b.close(); } catch { /* ignore */ }
  }
}

if (browserAvailable) {
  setInterval(() => { for (const s of [...sessions.values()]) if (Date.now() - s.lastUsed > IDLE_MS) void closeSession(s); }, 60_000).unref();
  process.once("exit", () => { try { browser?.process()?.kill("SIGKILL"); } catch { /* ignore */ } });
}

const getSession = (id) => {
  const s = sessions.get(id || [...sessions.keys()].pop());
  if (!s) throw new Error("No open browser session. Call browser_open first.");
  s.lastUsed = Date.now();
  return s;
};

function checkUrl(u) {
  let url; try { url = new URL(u); } catch { throw new Error("Invalid URL"); }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only http and https URLs can be opened");
  if (url.username || url.password) throw new Error("URLs containing embedded credentials are not allowed");
  return url.toString();
}

function isPublicIPv4(ip) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b, c] = parts;
  if (a === 127 && b === 0 && c === 0 && parts[3] === 1) return true; // Explicit local dev-server exception.
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && (b === 168 || (b === 0 && (c === 0 || c === 2)))) return false;
  if (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  return true;
}

function isPublicIPv6(ip) {
  const value = ip.toLowerCase().split("%", 1)[0];
  if (value === "::1") return true; // Explicit local dev-server exception.
  if (value.startsWith("::ffff:")) {
    const mapped = value.slice(7);
    if (net.isIP(mapped) === 4) return isPublicIPv4(mapped);
    const hex = mapped.split(":");
    if (hex.length === 2 && hex.every((x) => /^[0-9a-f]{1,4}$/.test(x))) {
      const n = hex.map((x) => parseInt(x, 16));
      return isPublicIPv4(`${n[0] >> 8}.${n[0] & 255}.${n[1] >> 8}.${n[1] & 255}`);
    }
    return false;
  }
  const first = parseInt(value.split(":")[0] || "0", 16);
  if (value.startsWith("::") || (first & 0xfe00) === 0xfc00 || (first & 0xffc0) === 0xfe80 || first === 0xff00) return false;
  // Only globally routable unicast space is accepted; this also excludes NAT64, 6to4 and documentation blocks.
  if (first < 0x2000 || first > 0x3fff || value.startsWith("2001:db8:") || value.startsWith("3fff:")) return false;
  return true;
}

export async function assertSafeUrl(raw) {
  const url = new URL(raw);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Blocked non-HTTP browser request");
  if (url.username || url.password) throw new Error("Blocked browser request containing embedded credentials");
  const rawHost = url.hostname.toLowerCase();
  const host = rawHost.startsWith("[") ? rawHost.slice(1, -1) : rawHost;
  if (host === "localhost" || host.endsWith(".localhost")) return;
  const version = net.isIP(host);
  if (version) {
    const safe = version === 4 ? isPublicIPv4(host) : isPublicIPv6(host);
    if (!safe) throw new Error(`Blocked request to a private or reserved IP address: ${host}`);
    return;
  }
  let records;
  try { records = await dns.lookup(host, { all: true, verbatim: true }); }
  catch { throw new Error(`Could not safely resolve browser request host: ${host}`); }
  if (!records.length || records.some(({ address, family }) => !(family === 4 ? isPublicIPv4(address) : isPublicIPv6(address)))) {
    throw new Error(`Blocked browser request to a private, loopback, link-local, or reserved destination: ${host}`);
  }
}

const state = async (s) => ({ session: s.id, url: s.page.url(), title: await s.page.title().catch(() => "") });

const SNAPSHOT_JS = () => {
  const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none"; };
  document.querySelectorAll("[data-mi]").forEach((el) => el.removeAttribute("data-mi"));
  const els = [...document.querySelectorAll("a[href],button,input,select,textarea,summary,[role=button],[role=link],[role=tab],[role=checkbox],[onclick],[contenteditable=true]")].filter(vis).slice(0, 80);
  const items = els.map((el, i) => {
    el.setAttribute("data-mi", String(i + 1));
    const label = (el.getAttribute("aria-label") || el.innerText || el.getAttribute("placeholder") || el.getAttribute("title") || el.getAttribute("alt") || "").trim().replace(/\s+/g, " ").slice(0, 80);
    const o = { selector: `[data-mi="${i + 1}"]`, tag: el.tagName.toLowerCase(), text: label };
    if (el.type && el.tagName === "INPUT") o.type = el.type;
    if (el.name) o.name = el.name;
    if (el.tagName === "A") o.href = el.getAttribute("href");
    if (el.disabled) o.disabled = true;
    if (el.tagName === "INPUT" && el.type === "password") delete o.text;
    return o;
  });
  const fullText = (document.body?.innerText || "").replace(/\n{3,}/g, "\n\n");
  return { text: fullText.slice(0, 30000), text_truncated: fullText.length > 30000, elements: items };
};

export function registerBrowser(mcp, d) {
  if (!browserAvailable) return;
  const { z, textResult } = d;

  mcp.registerTool("browser_open", {
    description: "Open a URL in a headless Chromium session (http/https, including localhost dev servers). Returns a session id used by the other browser_* tools. Reuses the session if one with that id exists.",
    inputSchema: { url: z.string().max(2000), session: z.string().max(40).optional(), width: z.number().int().min(320).max(2560).optional(), height: z.number().int().min(320).max(2000).optional(), mobile: z.boolean().optional() },
  }, async ({ url, session: sid, width = 1280, height = 800, mobile = false }) => {
    const target = checkUrl(url);
    await assertSafeUrl(target);
    let s = sid ? sessions.get(sid) : null;
    let created = false;
    if (!s) {
      if (sessions.size >= MAX_SESSIONS) throw new Error(`Too many open sessions (max ${MAX_SESSIONS}). Close one with browser_close.`);
      const b = await getBrowser();
      const context = await b.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width, height }, isMobile: mobile, hasTouch: mobile, ignoreHTTPSErrors: true, serviceWorkers: "block" });
      const page = await context.newPage();
      s = { id: sid || `b${++counter}`, context, page, console: [], failed: [], lastUsed: Date.now() };
      page.on("console", (m) => { s.console.push({ type: m.type(), text: m.text().slice(0, 300) }); if (s.console.length > 200) s.console.shift(); });
      page.on("pageerror", (e) => { s.console.push({ type: "pageerror", text: String(e.message).slice(0, 300) }); if (s.console.length > 200) s.console.shift(); });
      page.on("requestfailed", (r) => { s.failed.push({ url: r.url().slice(0, 200), error: r.failure()?.errorText }); if (s.failed.length > 100) s.failed.shift(); });
      page.on("response", (r) => { if (r.status() >= 400) { s.failed.push({ url: r.url().slice(0, 200), status: r.status() }); if (s.failed.length > 100) s.failed.shift(); } });
      await context.route("**/*", async (route) => {
        try {
          await assertSafeUrl(route.request().url());
          await route.continue();
        } catch (error) {
          s.failed.push({ url: route.request().url().slice(0, 200), error: String(error.message).slice(0, 200), blocked: true });
          if (s.failed.length > 100) s.failed.shift();
          await route.fulfill({ status: 403, contentType: "text/plain", body: "Blocked by Micode browser security policy" }).catch(() => {});
        }
      });
      sessions.set(s.id, s);
      created = true;
    }
    s.lastUsed = Date.now();
    const failedBeforeNavigation = s.failed.length;
    try {
      const resp = await s.page.goto(target, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await s.page.waitForLoadState("load", { timeout: 5000 }).catch(() => {});
      const blocked = s.failed.slice(failedBeforeNavigation).find((entry) => entry.blocked);
      if (blocked) throw new Error(`Navigation blocked by browser network safety policy: ${blocked.error}`);
      return textResult({ ...(await state(s)), http_status: resp?.status() ?? null });
    } catch (error) {
      if (created) await closeSession(s);
      throw error;
    }
  });

  mcp.registerTool("browser_snapshot", {
    description: "Read the current page: visible text plus a numbered list of interactive elements, each with a selector you can pass to browser_act (valid until the next snapshot or navigation).",
    inputSchema: { session: z.string().optional(), max_chars: z.number().int().min(500).max(30000).optional() },
  }, async ({ session: sid, max_chars = 6000 }) => {
    const s = getSession(sid);
    const snap = await s.page.evaluate(SNAPSHOT_JS);
    return textResult({ ...(await state(s)), text: snap.text.slice(0, max_chars), text_truncated: snap.text_truncated || snap.text.length > max_chars, elements: snap.elements });
  });

  mcp.registerTool("browser_screenshot", {
    description: "Take a screenshot of the page (or one element by selector). The image is returned inline and also saved on the server.",
    inputSchema: { session: z.string().optional(), full_page: z.boolean().optional(), selector: z.string().max(500).optional() },
  }, async ({ session: sid, full_page = false, selector }) => {
    const s = getSession(sid);
    const dimensions = selector
      ? await s.page.locator(selector).first().boundingBox({ timeout: 10_000 })
      : await s.page.evaluate((wholePage) => ({ width: wholePage ? document.documentElement.scrollWidth : window.innerWidth, height: wholePage ? document.documentElement.scrollHeight : window.innerHeight }), full_page);
    if (!dimensions) throw new Error("Screenshot target is not visible");
    const width = Math.ceil(dimensions.width), height = Math.ceil(dimensions.height);
    if (width > 4000 || height > 12000 || width * height > 16_000_000) throw new Error("Screenshot exceeds the 16-megapixel safety limit; capture a smaller element or viewport instead.");
    const take = async (type, quality) => selector
      ? s.page.locator(selector).first().screenshot({ type, quality, timeout: 10_000 })
      : s.page.screenshot({ fullPage: full_page, type, quality, timeout: 15_000 });
    let buf = await take("png");
    let mime = "image/png", ext = "png";
    if (buf.length > 1_500_000) { buf = await take("jpeg", 55); mime = "image/jpeg"; ext = "jpg"; }
    if (buf.length > 2_000_000) throw new Error("Screenshot output exceeds the 2 MB limit; capture a smaller area.");
    fs.mkdirSync(SHOTS, { recursive: true, mode: 0o700 });
    const file = path.join(SHOTS, `${s.id}-${Date.now()}-${crypto.randomBytes(2).toString("hex")}.${ext}`);
    fs.writeFileSync(file, buf, { mode: 0o600 });
    const old = fs.readdirSync(SHOTS).map((f) => ({ f, t: fs.statSync(path.join(SHOTS, f)).mtimeMs })).sort((a, b) => b.t - a.t).slice(60);
    for (const o of old) fs.rmSync(path.join(SHOTS, o.f), { force: true });
    return { content: [{ type: "image", data: buf.toString("base64"), mimeType: mime }, { type: "text", text: JSON.stringify({ ...(await state(s)), saved_to: file, bytes: buf.length }) }] };
  });

  mcp.registerTool("browser_act", {
    description: "Interact with the page. action: click, type (fills selector with text; submit=true presses Enter), press (key, e.g. Enter), select (value), hover, scroll (value=up|down|top|bottom), wait (selector to appear, or ms), back, reload, eval (script: a JavaScript expression run in the page, result returned). Use selectors from browser_snapshot, or CSS/text= selectors.",
    inputSchema: { session: z.string().optional(), action: z.enum(["click", "type", "press", "select", "hover", "scroll", "wait", "back", "reload", "eval"]), selector: z.string().max(500).optional(), text: z.string().max(5000).optional(), key: z.string().max(40).optional(), value: z.string().max(500).optional(), ms: z.number().int().min(0).max(30000).optional(), script: z.string().max(5000).optional(), submit: z.boolean().optional() },
  }, async (a) => {
    const s = getSession(a.session);
    const p = s.page;
    const sel = () => { if (!a.selector) throw new Error(`selector is required for action=${a.action}`); return p.locator(a.selector).first(); };
    let result;
    switch (a.action) {
      case "click": await sel().click({ timeout: 10_000 }); break;
      case "type": { const l = sel(); await l.fill(a.text ?? "", { timeout: 10_000 }); if (a.submit) await l.press("Enter"); break; }
      case "press": if (a.selector) await sel().press(a.key || "Enter"); else await p.keyboard.press(a.key || "Enter"); break;
      case "select": await sel().selectOption(a.value ?? ""); break;
      case "hover": await sel().hover({ timeout: 10_000 }); break;
      case "scroll": await p.evaluate((v) => { if (v === "top") window.scrollTo(0, 0); else if (v === "bottom") window.scrollTo(0, document.body.scrollHeight); else window.scrollBy(0, (v === "up" ? -1 : 1) * window.innerHeight * 0.8); }, a.value || "down"); break;
      case "wait": if (a.selector) await p.locator(a.selector).first().waitFor({ state: "visible", timeout: a.ms || 10_000 }); else await p.waitForTimeout(a.ms ?? 1000); break;
      case "back": await p.goBack({ waitUntil: "domcontentloaded", timeout: 15_000 }); break;
      case "reload": await p.reload({ waitUntil: "domcontentloaded", timeout: 20_000 }); break;
      case "eval": { if (!a.script) throw new Error("script is required for action=eval"); const r = await p.evaluate(`(async () => (${a.script}))()`); result = JSON.stringify(r === undefined ? null : r)?.slice(0, 4000); break; }
      default: throw new Error("unknown action");
    }
    if (["click", "press", "select"].includes(a.action)) await p.waitForLoadState("domcontentloaded", { timeout: 3000 }).catch(() => {});
    return textResult({ ok: true, ...(await state(s)), ...(result !== undefined ? { result } : {}) });
  });

  mcp.registerTool("browser_logs", {
    description: "Console messages (errors and warnings first), uncaught page errors and failed or 4xx/5xx network requests for a session.",
    inputSchema: { session: z.string().optional() },
  }, async ({ session: sid }) => {
    const s = getSession(sid);
    const weight = { pageerror: 0, error: 1, warning: 2 };
    const logs = [...s.console].sort((a, b) => (weight[a.type] ?? 9) - (weight[b.type] ?? 9)).slice(0, 50);
    return textResult({ ...(await state(s)), console: logs, failed_requests: s.failed.slice(-30) });
  });

  mcp.registerTool("browser_close", {
    description: "Close a browser session (or all of them if no session is given).",
    inputSchema: { session: z.string().optional() },
  }, async ({ session: sid }) => {
    const list = sid ? [sessions.get(sid)].filter(Boolean) : [...sessions.values()];
    for (const s of list) await closeSession(s);
    return textResult({ closed: list.map((s) => s.id) });
  });
}
