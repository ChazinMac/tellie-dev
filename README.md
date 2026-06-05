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
- **`cli/`** — a `tellie` command-line tool (`tellie send` / `dismiss`,
  with `--source`, file, and piped-stdin support). See [cli/README.md](cli/README.md).
- **`cookbook/`** — recipes for the notch surface (start with
  [agent lifecycle status](cookbook/agent-lifecycle-status.md)).
- **[`CHEATSHEET.md`](CHEATSHEET.md)** — copy-paste terminal quick reference
  for every verb and flag.
- **`TELLIE-FOR-DEVS-SPEC.md`** — the working spec: the verb primitive, the
  three access doors, multi-source surface, and the recipe cookbook.

## Status

Pre-release, building toward the Tellie 1.4 "Tellie for Developers" launch.
This repo is private during development and goes public at launch, when the
`@tellie/mcp` and `@tellie/cli` packages are published to npm.
