# VPS access setup

DevForge v0.1 reaches a VPS through OpenSSH from the machine running the local MCP process. This avoids exposing an unauthenticated command-execution HTTP service on the public internet.

1. Create a dedicated, least-privilege SSH user on the VPS.
2. Add a public key for that user; keep the private key on the local machine.
3. Add an SSH config alias in `~/.ssh/config` and set permissions (`chmod 600 ~/.ssh/config`).
4. Test the alias with `ssh my-vps 'id && pwd'`.
5. Use DevForge's SSH tools with the alias and absolute project path.

For direct ChatGPT web access without a local host, deploy a separate authenticated remote MCP gateway on the VPS or a private network. It must use TLS, strong authentication, per-project allowlists, audit logging, command timeouts, rate limits, and explicit authorization for writes and process control. Do not expose a raw shell endpoint. This release intentionally does not invent or preconfigure a remote URL; the real VPS hostname and secure deployment are needed first.
