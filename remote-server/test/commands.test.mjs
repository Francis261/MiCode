import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { browserAvailable, assertSafeUrl } from "../src/browser.js";

const serverPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "server.js");
const CLIENT = { id: "micode-chatgpt", secret: "chatgpt-test-secret" };
const CALLBACK = "https://chatgpt.com/connector/oauth/BRwWk1XEwrA1";
const PASSWORD = "test-owner-password-123";
const TOKEN_SECRET = "t".repeat(48);

const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "micode-cmd-"));
const WS = path.basename(workspace);
fs.mkdirSync(path.join(workspace, "sub"));
const servers = [];

async function freePort() {
  const probe = createServer();
  await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
  const port = probe.address().port;
  await new Promise((resolve) => probe.close(resolve));
  return port;
}

async function start(port, extra = {}) {
  const base = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, [serverPath], {
    env: {
      PATH: process.env.PATH, PORT: String(port), HOST: "127.0.0.1",
      MICODE_ENV_FILE: path.join(workspace, "none.env"), MICODE_WORKSPACES: workspace,
      MICODE_PUBLIC_URL: base, MICODE_TOKEN_SECRET: TOKEN_SECRET, MICODE_OWNER_PASSWORD: PASSWORD,
      MICODE_CHATGPT_CLIENT_ID: CLIENT.id, MICODE_CHATGPT_CLIENT_SECRET: CLIENT.secret, ...extra,
    },
    stdio: "ignore",
  });
  servers.push(child);
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(`${base}/health`)).ok) break; } catch { /* starting */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  // full OAuth flow to obtain a bearer token
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  const authz = await fetch(`${base}/chatgpt/oauth/authorize`, {
    method: "POST", redirect: "manual", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: CLIENT.id, redirect_uri: CALLBACK, response_type: "code", code_challenge: challenge, code_challenge_method: "S256", owner_password: PASSWORD, decision: "approve" }).toString(),
  });
  const code = new URL(authz.headers.get("location")).searchParams.get("code");
  const tok = await (await fetch(`${base}/chatgpt/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", authorization: "Basic " + Buffer.from(`${CLIENT.id}:${CLIENT.secret}`).toString("base64") },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: CALLBACK, code_verifier: verifier }).toString(),
  })).json();

  let id = 0;
  const rpc = async (method, params) => {
    const res = await fetch(`${base}/chatgpt/mcp`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream", authorization: `Bearer ${tok.access_token}` },
      body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }),
    });
    const text = await res.text();
    const line = (res.headers.get("content-type") || "").includes("event-stream") ? text.split("\n").find((l) => l.startsWith("data:")).slice(5) : text;
    return JSON.parse(line);
  };
  const tools = async () => (await rpc("tools/list", {})).result.tools.map((t) => t.name);
  const call = async (name, args) => {
    const r = (await rpc("tools/call", { name, arguments: { workspace: WS, ...args } })).result;
    const text = r.content[0].text;
    return { isError: Boolean(r.isError), text, json: r.isError ? null : JSON.parse(text) };
  };
  return { tools, call };
}

let restricted, open;
before(async () => {
  restricted = await start(await freePort());
  open = await start(await freePort(), { MICODE_ALLOWED_COMMANDS: "*" });
});
after(() => { servers.forEach((s) => s.kill()); fs.rmSync(workspace, { recursive: true, force: true }); });

test("browser automation opens, inspects, interacts with, and closes a local page", { skip: !browserAvailable }, async () => {
  const pageServer = createServer((_req, res) => {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end("<!doctype html><title>Micode test page</title><main>Ready</main><button id='test-button' onclick=\"document.querySelector('main').textContent='Clicked successfully'\">Click me</button>");
  });
  await new Promise((resolve) => pageServer.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${pageServer.address().port}`;
  let session;
  try {
    const opened = await restricted.call("browser_open", { url });
    assert.equal(opened.isError, false, opened.text);
    session = opened.json.session;
    assert.equal(opened.json.title, "Micode test page");

    const before = await restricted.call("browser_snapshot", { session });
    assert.equal(before.isError, false, before.text);
    assert.match(before.json.text, /Ready/);
    assert.ok(before.json.elements.some((el) => el.text === "Click me"));

    const clicked = await restricted.call("browser_act", { session, action: "click", selector: "#test-button" });
    assert.equal(clicked.isError, false, clicked.text);
    const after = await restricted.call("browser_snapshot", { session });
    assert.match(after.json.text, /Clicked successfully/);

    const logs = await restricted.call("browser_logs", { session });
    assert.equal(logs.isError, false, logs.text);
    assert.equal(logs.json.failed_requests.length, 0);

    const closed = await restricted.call("browser_close", { session });
    assert.equal(closed.isError, false, closed.text);
    assert.deepEqual(closed.json.closed, [session]);
    session = null;
  } finally {
    if (session) await restricted.call("browser_close", { session });
    await new Promise((resolve) => pageServer.close(resolve));
  }
});

test("browser URL guard blocks private, loopback, link-local, and metadata destinations", async () => {
  for (const url of [
    "http://169.254.169.254/latest/meta-data/",
    "http://10.0.0.1/",
    "http://192.168.1.1/",
    "http://[::]/",
    "http://[fd00::1]/",
    "http://[fe80::1]/",
  ]) {
    await assert.rejects(assertSafeUrl(url), /private|reserved|Blocked/i, url);
  }
  const direct = await restricted.call("browser_open", { url: "http://169.254.169.254/latest/meta-data/" });
  assert.equal(direct.isError, true, direct.text);

  await assert.doesNotReject(assertSafeUrl("http://127.0.0.1:3000/"));
  await assert.doesNotReject(assertSafeUrl("http://localhost:3000/"));
  await assert.rejects(assertSafeUrl("https://user:password@example.com/"), /credentials/i);
});

test("browser automation tools are exposed only when Playwright Chromium is available", async () => {
  const names = await restricted.tools();
  const browserTools = ["browser_open", "browser_snapshot", "browser_screenshot", "browser_act", "browser_logs", "browser_close"];
  for (const name of browserTools) assert.equal(names.includes(name), browserAvailable, `${name} availability mismatch`);
});

test("default mode: allowlist enforced and run_shell is not offered", async () => {
  assert.ok(!(await restricted.tools()).includes("run_shell"));
  const r = await restricted.call("run_command", { command: "uname" });
  assert.equal(r.isError, true);
  assert.match(r.text, /not in MICODE_ALLOWED_COMMANDS/);
});

test("unrestricted mode: any executable by name or path", async () => {
  assert.ok((await open.tools()).includes("run_shell"));
  const byName = await open.call("run_command", { command: "uname" });
  assert.equal(byName.json.exit_code, 0);
  const byPath = await open.call("run_command", { command: "/bin/echo", args: ["hi"] });
  assert.equal(byPath.json.stdout, "hi\n");
});

test("run_shell: pipes, cwd, and no server secrets in the child environment", async () => {
  const piped = await open.call("run_shell", { command: "echo hello | tr a-z A-Z" });
  assert.equal(piped.json.stdout, "HELLO\n");
  const inSub = await open.call("run_shell", { command: "pwd", cwd: "sub" });
  assert.ok(inSub.json.stdout.trim().endsWith("/sub"));
  const env = await open.call("run_shell", { command: "env" });
  assert.ok(!env.json.stdout.includes("MICODE_TOKEN_SECRET") && !env.json.stdout.includes(TOKEN_SECRET));
});

test("run_shell: cwd cannot escape the workspace; timeout kills the process group", async () => {
  const esc = await open.call("run_shell", { command: "pwd", cwd: "../.." });
  assert.equal(esc.isError, true);
  const t0 = Date.now();
  const slow = await open.call("run_shell", { command: "sleep 30 & sleep 30; echo done", timeout_ms: 1000 });
  assert.equal(slow.json.timed_out, true);
  assert.ok(Date.now() - t0 < 6000);
});
