# DevForge

Local-first coding-agent MCP plugin for local project work and VPS access over SSH.

## Requirements
- Node.js 18 or newer
- Git for Git tools
- OpenSSH client for VPS tools
- A compatible host that can launch local stdio MCP servers

## Configure
Edit `mcp.json` or configure the same environment variables in your MCP host:

- `DEVFORGE_WORKSPACES`: allowed project roots, separated by `:` on macOS/Linux or `;` on Windows.
- `DEVFORGE_DEFAULT_WORKSPACE`: optional default workspace.

The example configuration defaults to `~/Projects`. Change it to your actual project directory before use.

## Tools
Filesystem: `list_workspaces`, `list_files`, `read_file`, `read_multiple_files`, `write_file`, `update_file`, `delete_file`, `create_directory`, `move_path`, `search_files`, `search_content`.

Execution: `execute_command`.

Git: `git_status`, `git_diff`, `git_log`.

VPS over SSH: `ssh_execute`, `ssh_list_files`, `ssh_read_file`, `ssh_write_file`.

## Security model
Filesystem access is restricted to configured roots. Shell commands are spawned without a shell and run from the selected workspace. A small set of dangerous command patterns is blocked. VPS connections use SSH aliases and the local SSH agent/config; no private key is bundled. Remote writes and file deletion require `confirm: true`, which the agent must only send after explicit user approval.

This is a powerful developer tool. Use it only on machines and projects you own or are authorized to administer. Review commands before production use.

## Test locally

```bash
DEVFORGE_WORKSPACES="$HOME/Projects" node server/index.js
```

The process speaks newline-delimited JSON-RPC on stdin/stdout. Do not type shell commands into this process; connect through an MCP host.
