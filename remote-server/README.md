# DevForge Remote MCP Server

This is the HTTPS-capable companion to the local stdio MCP server. It exposes a stateless Streamable HTTP MCP endpoint at `/mcp` and a basic health endpoint at `/health`.

## Tools

- `workspace_list`, `list_files`, `read_file`, `write_file`, `delete_file`, `search_files`, `run_command`.
- Workspaces are explicitly mounted/configured in `DEVFORGE_WORKSPACES`; tools cannot select arbitrary host paths.
- File paths are workspace-relative and checked against traversal and symlink escapes.
- Commands use `spawn(..., { shell: false })`; only executable names in `DEVFORGE_ALLOWED_COMMANDS` are accepted. Child processes receive a minimal environment, not the server's API key. Arguments are still powerful: a trusted caller can run project scripts and code. Do not expose this endpoint to untrusted users.

## Local run

Requires Node.js 20+.

```sh
cd remote-server
npm install
cp .env.example .env
# Set a long random DEVFORGE_API_KEY and an absolute DEVFORGE_WORKSPACES path.
mkdir -p workspaces
npm start
```

Test health: `curl http://127.0.0.1:8787/health`

MCP endpoint: `http://127.0.0.1:8787/mcp` (use HTTPS in production).

## Docker

```sh
cd remote-server
cp .env.example .env
# Edit .env and set a unique secret. Never commit .env.
mkdir -p workspaces
# The container runs as the unprivileged node user (UID 1000).
sudo chown -R 1000:1000 workspaces
docker compose up -d --build
```

The Compose file does not publish the MCP port to the host. Put a reverse proxy or Cloudflare Tunnel in front of it and route HTTPS to the service on the private Docker network. Enforce TLS, request-size limits, and access controls at the proxy too.

## Connect a client

Configure your MCP client with the Streamable HTTP URL `https://YOUR_HOST/mcp` and the HTTP header `Authorization: Bearer YOUR_DEVFORGE_API_KEY`. The client must support MCP Streamable HTTP and custom authorization headers. A ChatGPT connector/plugin may require its own compatible OAuth or app configuration; this server alone does not install or register itself in ChatGPT.

## Security checklist

1. Use a dedicated unprivileged OS account or container; never run as root.
2. Keep workspaces separate from secrets, SSH private keys, production data, and system directories.
3. Generate a unique 32+ byte API key; store it in a secret manager or protected environment file. Rotate it if exposed.
4. Put the service behind HTTPS. Do not expose the raw port publicly.
5. Restrict network ingress (VPN, Cloudflare Access, IP allowlist) and add proxy-level rate limiting.
6. Keep the executable allowlist narrow. For higher-risk deployments, remove interpreters/package managers and add command-specific argument policies.
7. Back up workspaces and audit access. The in-process rate limit is best-effort and resets on restart; use a gateway for production throttling.
8. The server has broad OS-user access to whatever is mounted. Workspace path checks are not a substitute for OS/container isolation.

## Configuration

- `PORT`, `HOST`: listener settings (default 8787 / 127.0.0.1).
- `DEVFORGE_API_KEY`: required bearer token (minimum 32 characters).
- `DEVFORGE_WORKSPACES`: path-delimited list of allowed absolute directories.
- `DEVFORGE_ALLOWED_COMMANDS`: comma-separated executable names (default: git,npm,pnpm,yarn,node,python3).

The original local stdio server remains in the plugin ZIP and is not replaced by this service.
