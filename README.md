# MiCode

MiCode is an Expo React Native workspace for managing coding projects and GitHub repositories, with a planned secure AI-agent execution service.

## Development

```bash
npm install
npm run start -- --tunnel
npm run lint
npm run typecheck
npm run export:web
```

## Implemented client functionality

- Responsive dashboard, Projects, Activity, and Settings screens.
- Create local project records and persist them with AsyncStorage.
- Search, open, rename through workspace APIs, and delete local projects.
- Activity timeline with clear-history action.
- Connect a GitHub fine-grained personal access token, validate it against GitHub, store it in Expo SecureStore on Android/iOS, and disconnect it.
- Browse accessible GitHub repositories and import them into the local project list.
- Create a GitHub repository from the new-project flow when the token has the optional Repository creation: write permission.
- Browse repository folders and files, edit text files, and commit updates through GitHub's Contents API.

## GitHub token permissions

Use a fine-grained token limited to only the repositories you want MiCode to access.

Minimum permissions for current features:
- Metadata: read (GitHub requires this for repository access).
- Contents: read and write (browse files and commit file changes).
- Repository creation: write (optional; only if you want MiCode to create new repositories).
- Pull requests: read and write (list and create pull requests).
- Actions: read and write (list workflows/runs and dispatch workflows).

Do not grant broad Administration, Secrets, Actions, Pull requests, or organization permissions for the current features. Classic tokens are less granular: use `repo` for private repository access and file changes. The `workflow` scope is needed only when modifying files under `.github/workflows`.

The app validates the token using GitHub's authenticated-user endpoint and stores it with Expo SecureStore on Android/iOS. The token is sent directly to GitHub API requests from the app and is not sent to a MiCode server. Do not use a token on a shared or untrusted device. Revoke it from GitHub if it may have been exposed.

## Agent backend (initial implementation)

A separate Node.js backend now lives in `agent-server/`. It includes an OpenAI-compatible tool-calling coding agent with SSE token streaming, temporary GitHub clones, an allowlisted Docker-isolated terminal, branch publishing, pull-request creation/listing, GitHub Actions workflow/run listing and dispatch, and a static build-preview container/proxy. See `agent-server/README.md` for setup and security limitations.

The backend is started separately from Expo. It needs a server bearer token, a configured AI provider API key, Docker, and an HTTPS public origin for remote mobile access and live preview. The current backend is an initial single-workspace implementation, not yet a production multi-tenant service.

## Still not implemented

- Production multi-tenant authentication, per-user authorization and credential vault.
- Durable sessions, workspace cleanup policies, audit logs and per-user resource quotas.
- Full interactive shell/PTY streaming (the current terminal is command/response with an allowlist).
- Dynamic preview support for arbitrary server-rendered apps (the current preview serves static build output).
- Cross-device project synchronization and remote workspace persistence.

## Architecture direction

- Expo Router client for Android, iOS, and web.
- GitHub as the source of truth for repository content.
- A trusted backend for OAuth or securely scoped token exchange, repository operations, and short-lived agent sessions.
- GitHub Actions or self-hosted runners for isolated agent execution.
- Provider credentials stored server-side and never exposed to the mobile client.
