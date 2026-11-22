# Renewable GitHub Actions runtime template

This template is installed into a user's repository as:

- `.github/workflows/micode-agent.yml`
- `MiCode/runtime/prepare.js`
- `MiCode/runtime/runner.js`

The workflow starts a temporary runner, prepares durable continuation files, exposes its local runtime through a Cloudflare Quick Tunnel, and schedules a handoff. The default handoff interval is 270 minutes (4 hours 30 minutes).

## Required repository configuration

Configure these Actions secrets before dispatching the workflow:

- `MICODE_CONTROL_PLANE_URL`: HTTPS origin of the persistent MiCode control plane.
- `MICODE_RUNNER_CALLBACK_TOKEN`: per-installation callback credential.
- `MICODE_AGENT_TOKEN`: per-project runtime authentication token.
- `MICODE_AI_BASE_URL` / `MICODE_AI_API_KEY`: provider credentials (the template currently uses `MICODE_AI_BASE_URL` as `AI_BASE_URL`).
- `MICODE_AI_MODEL`: optionally set as a repository variable.

The workflow's built-in `GITHUB_TOKEN` needs Contents: write to push checkpoint branches. Do not put PATs or provider keys in tracked files.

## Handoff semantics

The runtime creates a branch named `micode/agent/<session-id>`, writes a continuation checkpoint, commits all staged repository changes, pushes that branch, verifies the push command succeeded, and then reports `handoff.ready` to the control plane. It does not force-push and does not push to the user's default branch.

A successful handoff must not be reported unless the push succeeds. The next workflow run must check out the latest checkpoint branch (the control plane must pass that branch/ref when dispatching the next run).

## Important implementation boundary

This is the runner-side foundation, not yet the complete end-to-end product. The persistent control plane must implement authenticated `POST /v1/runner/events`, store run/tunnel/checkpoint state, send notifications, request user approval, and dispatch the next workflow run. The minimal runner HTTP endpoint in this template is a connectivity/authentication scaffold; the full coding-agent API must be integrated before this is exposed to users.
