# Tellie for Developers

[![The Mac notch collapsed to a single pill, then expanded on hover to show Claude, Tests, Storm and CI reporting from a MacBook Pro, with a weather row arriving from a Mac mini.](https://tellieapp.com/tellie-notch-loop.gif)](https://tellieapp.com/developers)

<sup>Four agents on this Mac and one on another, all reporting into one notch. Hover to peek; rows with links are clickable.</sup>

Developer tools for [Tellie](https://tellieapp.com/developers), the silent second screen
that lives in the Mac notch. Push a glanceable status to the notch (and read it
back) from your terminal, a script, CI, or an AI agent.

All of this wraps Tellie's public `tellie://` URL scheme (no private API), so it
works against any installed Tellie build.

## Packages

- **`cli/`** — the `tellie` command-line tool (`@tellie/cli`): `update` / `flash`
  / `send` / `clear` / `status` / `log`, the one-command Claude Code hook
  (`setup claude-code`), and the shared fleet feed (`--feed` / `--origin`). See
  [cli/README.md](cli/README.md).
- **`mcp/`** — an MCP server (`@tellie/mcp`) so MCP-aware AI clients (Claude
  Desktop, Cursor, etc.) can push to Tellie. See [mcp/README.md](mcp/README.md).
- **`cookbook/`** — recipes for the notch surface (start with
  [agent lifecycle status](cookbook/agent-lifecycle-status.md)).
- **[`CHEATSHEET.md`](CHEATSHEET.md)** — copy-paste terminal quick reference
  for every verb and flag.

## Docs

Full reference: <https://tellieapp.com/developers>. Agent-readable docs (point a
capable agent here and say "Tellie me"): <https://tellieapp.com/llms.txt>.

## Status

Published to npm: `@tellie/mcp` and `@tellie/cli` are live. The Claude Code hook
and the fleet feed ship with the `@tellie/cli` 0.5.x line (pairs with Tellie
1.4.3+, which added the feed watcher and origin labels in the notch).

## The story

Tellie was built in about 3 days by a 30-year Apple veteran pairing with AI. If
you're curious how (and why a developer surface exists at all), here's the origin
story: <https://stevechazin.com/i-built-a-mac-app-in-3-days-and-you-can-too/>
