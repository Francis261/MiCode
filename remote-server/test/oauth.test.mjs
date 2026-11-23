import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = 18787;
const BASE = `http://127.0.0.1:${PORT}`;
const PASSWORD = "test-owner-password-123";
const CHATGPT = { id: "micode-chatgpt", secret: "chatgpt-test-secret" };
const CLOUDE = { id: "micode-cloude", secret: "cloude-test-secret" };
const CHATGPT_CALLBACK = "https://chatgpt.com/connector/oauth/BRwWk1XEwrA1";

const serverPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "server.js");
let child, workspace;

before(async () => {
  workspace = fs.mkdtempSync(path.join(os.tmpdir(), "micode-test-"));
  child = spawn(process.execPath, [serverPath], {
    env: {
      PATH: process.env.PATH,
      PORT: String(PORT),
      HOST: "127.0.0.1",
      MICODE_ENV_FILE: path.join(workspace, "no-such.env"), // keep the test hermetic
      MICODE_WORKSPACES: workspace,
      MICODE_PUBLIC_URL: BASE,
      MICODE_TOKEN_SECRET: "t".repeat(48),
      MICODE_OWNER_PASSWORD: PASSWORD,
      MICODE_CHATGPT_CLIENT_ID: CHATGPT.id,
      MICODE_CHATGPT_CLIENT_SECRET: CHATGPT.secret,
      MICODE_CLOUDE_CLIENT_ID: CLOUDE.id,
      MICODE_CLOUDE_CLIENT_SECRET: CLOUDE.secret,
    },
    stdio: "ignore",
  });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(`${BASE}/health`)).ok) return; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("server did not start");
});
after(() => { child?.kill(); fs.rmSync(workspace, { recursive: true, force: true }); });

const basic = (c) => "Basic " + Buffer.from(`${c.id}:${c.secret}`).toString("base64");
const pkce = () => {
  const verifier = crypto.randomBytes(32).toString("base64url");
  return { verifier, challenge: crypto.createHash("sha256").update(verifier).digest("base64url") };
};
const form = (o) => new URLSearchParams(o).toString();

async function getCode(platform, client, redirect, challenge, password = PASSWORD) {
  const res = await fetch(`${BASE}/${platform}/oauth/authorize`, {
    method: "POST", redirect: "manual",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form({ client_id: client.id, redirect_uri: redirect, response_type: "code", code_challenge: challenge, code_challenge_method: "S256", state: "xyz", owner_password: password, decision: "approve" }),
  });
  return res;
}
async function token(platform, client, params, auth = basic(client)) {
  return fetch(`${BASE}/${platform}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", ...(auth ? { authorization: auth } : {}) },
    body: form(params),
  });
}
const mcpInit = (platform, bearer) => fetch(`${BASE}/${platform}/mcp`, {
  method: "POST",
  headers: { "content-type": "application/json", accept: "application/json, text/event-stream", ...(bearer ? { authorization: `Bearer ${bearer}` } : {}) },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "test", version: "1" } } }),
});

test("MCP endpoint rejects missing token and points at resource metadata", async () => {
  const res = await mcpInit("chatgpt");
  assert.equal(res.status, 401);
  assert.match(res.headers.get("www-authenticate"), /resource_metadata="http:\/\/127\.0\.0\.1:18787\/\.well-known\/oauth-protected-resource\/chatgpt\/mcp"/);
});

test("legacy /mcp and unconfigured platforms are not served", async () => {
  assert.equal((await mcpInit("gemini")).status, 404);
  const legacy = await fetch(`${BASE}/mcp`, { method: "POST", body: "{}" });
  assert.equal(legacy.status, 404);
});

test("discovery metadata", async () => {
  const prm = await (await fetch(`${BASE}/.well-known/oauth-protected-resource/chatgpt/mcp`)).json();
  assert.equal(prm.resource, `${BASE}/chatgpt/mcp`);
  assert.deepEqual(prm.authorization_servers, [`${BASE}/chatgpt`]);
  for (const url of [`${BASE}/.well-known/oauth-authorization-server/chatgpt`, `${BASE}/chatgpt/.well-known/openid-configuration`]) {
    const as = await (await fetch(url)).json();
    assert.equal(as.token_endpoint, `${BASE}/chatgpt/oauth/token`);
    assert.deepEqual(as.code_challenge_methods_supported, ["S256"]);
  }
});

test("authorize refuses unregistered redirect_uri and missing PKCE", async () => {
  const { challenge } = pkce();
  const bad = await getCode("chatgpt", CHATGPT, "https://evil.example/cb", challenge);
  assert.equal(bad.status, 400);
  const noPkce = await fetch(`${BASE}/chatgpt/oauth/authorize?${form({ client_id: CHATGPT.id, redirect_uri: CHATGPT_CALLBACK, response_type: "code", state: "s" })}`, { redirect: "manual" });
  assert.equal(noPkce.status, 302);
  assert.match(noPkce.headers.get("location"), /error=invalid_request/);
});

test("wrong owner password does not issue a code", async () => {
  const res = await getCode("chatgpt", CHATGPT, CHATGPT_CALLBACK, pkce().challenge, "nope");
  assert.equal(res.status, 401);
  assert.equal(res.headers.get("location"), null);
});

test("full flow: code + PKCE -> tokens -> MCP call -> refresh; code is single use", async () => {
  const { verifier, challenge } = pkce();
  const authz = await getCode("chatgpt", CHATGPT, CHATGPT_CALLBACK, challenge);
  assert.equal(authz.status, 302);
  const loc = new URL(authz.headers.get("location"));
  assert.equal(loc.origin + loc.pathname, CHATGPT_CALLBACK);
  assert.equal(loc.searchParams.get("state"), "xyz");
  const code = loc.searchParams.get("code");

  // wrong secret
  const badClient = await token("chatgpt", CHATGPT, { grant_type: "authorization_code", code, redirect_uri: CHATGPT_CALLBACK, code_verifier: verifier }, basic({ id: CHATGPT.id, secret: "wrong" }));
  assert.equal(badClient.status, 401);

  const ok = await token("chatgpt", CHATGPT, { grant_type: "authorization_code", code, redirect_uri: CHATGPT_CALLBACK, code_verifier: verifier });
  assert.equal(ok.status, 200);
  const tokens = await ok.json();
  assert.equal(tokens.token_type, "Bearer");

  const replay = await token("chatgpt", CHATGPT, { grant_type: "authorization_code", code, redirect_uri: CHATGPT_CALLBACK, code_verifier: verifier });
  assert.equal(replay.status, 400);

  assert.equal((await mcpInit("chatgpt", tokens.access_token)).status, 200);

  // a ChatGPT token must not work on another platform's endpoint
  assert.equal((await mcpInit("cloude", tokens.access_token)).status, 401);
  // tampered token
  assert.equal((await mcpInit("chatgpt", tokens.access_token.slice(0, -2) + "xx")).status, 401);

  const refreshed = await token("chatgpt", CHATGPT, { grant_type: "refresh_token", refresh_token: tokens.refresh_token });
  assert.equal(refreshed.status, 200);
  assert.equal((await mcpInit("chatgpt", (await refreshed.json()).access_token)).status, 200);
  // a refresh token is not an access token
  assert.equal((await mcpInit("chatgpt", tokens.refresh_token)).status, 401);
});

test("wrong PKCE verifier is rejected", async () => {
  const { challenge } = pkce();
  const code = new URL((await getCode("chatgpt", CHATGPT, CHATGPT_CALLBACK, challenge)).headers.get("location")).searchParams.get("code");
  const res = await token("chatgpt", CHATGPT, { grant_type: "authorization_code", code, redirect_uri: CHATGPT_CALLBACK, code_verifier: pkce().verifier });
  assert.equal(res.status, 400);
});

test("client_secret_post works and Claude callback is accepted for cloude", async () => {
  const { verifier, challenge } = pkce();
  const cb = "https://claude.ai/api/mcp/auth_callback";
  const code = new URL((await getCode("cloude", CLOUDE, cb, challenge)).headers.get("location")).searchParams.get("code");
  const res = await token("cloude", CLOUDE, { grant_type: "authorization_code", code, redirect_uri: cb, code_verifier: verifier, client_id: CLOUDE.id, client_secret: CLOUDE.secret }, null);
  assert.equal(res.status, 200);
});
