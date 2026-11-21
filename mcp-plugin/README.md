# DevForge MCP Plugin

This directory contains the distributable local-first DevForge MCP plugin.

## Contents

- `devforge-plugin.zip` — complete plugin package, including its MCP server, plugin manifest, MCP configuration, coding-agent skill, and VPS setup guide.

## Quick start

1. Download and extract `devforge-plugin.zip`.
2. Review the included `README.md` and configure `mcp.json` with your allowed local workspace root.
3. Ensure Node.js 18+, Git, and OpenSSH are installed.
4. Register the stdio MCP server with a compatible MCP host.
5. For VPS access, configure an SSH alias in `~/.ssh/config` and test it before using DevForge.

**Important:** This is a local stdio MCP executor. It operates on the machine where it runs and reaches a VPS through SSH. It is not a hosted remote MCP service and does not automatically expose a local computer to ChatGPT web. Review the included security rules before use.
