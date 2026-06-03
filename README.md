# Tellie for Developers

Developer tools for [Tellie](https://tellie.skytech.io), the Mac
teleprompter that lives in the notch. Push text and control Tellie's
silent second screen from your terminal or from AI clients.

All of this wraps Tellie's public `tellie://` URL scheme (no private API),
so it works against any installed Tellie build.

## Packages

- **`mcp/`** — an MCP server (`@tellie/mcp`) so MCP-aware AI clients
  (Claude Desktop, etc.) can send content to Tellie. Working spike today:
  one `send_to_tellie` tool. See [mcp/README.md](mcp/README.md).
- **`cli/`** — a `tellie` command-line tool. _(coming next)_

## Status

Pre-release, building toward the Tellie 1.4 "Tellie for Developers" launch.
This repo is private during development and goes public at launch, when the
`@tellie/mcp` and `@tellie/cli` packages are published to npm.
