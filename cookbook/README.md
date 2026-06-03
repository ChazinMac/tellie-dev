# Tellie Cookbook

Recipes for the Tellie notch surface. Tellie isn't one feature, it's a
glanceable surface you can push anything to from your terminal, an agent,
or any MCP client. Here's a growing set of things to do with it. Each is
just a combination of the verbs (`update`, `flash`, `clear`, `send`); mix
them however you like, or invent your own.

Setup (CLI / MCP / raw URL scheme): see the repo root README and
`../mcp/README.md`.

## Recipes

- **[Agent lifecycle status](agent-lifecycle-status.md)** — auto-show when an
  AI agent is working vs idle, perfectly synced, via your harness's
  start/stop hooks (Claude Code, OpenClaw, etc.). The flagship example.

### Coming soon (same verbs, different glance)

- **Build / test status** — `update` as a build or test run progresses.
- **Token + cost meter** — `update "142k tokens · $0.38"` as you go.
- **Pomodoro / timer** — `update` the remaining time; `flash` on done.
- **CI / webhook to notch** — a tiny script turns a webhook into a `flash`.
- **Standup notes / reminders** — park a glanceable cheat sheet with `send`.
- **"Now reading"** — `send` a script for your next founder/launch video.

## Bring your own

The whole point: these are examples, not limits. You have `update` (set a
line), `flash` (transient), `clear` (remove), and `send` (load readable
content), each with a `source` name and an `icon` (SF Symbol or emoji). Go
build the glance you wish you had.
