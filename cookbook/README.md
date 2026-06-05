# Tellie Cookbook

Recipes for the Tellie notch surface. Tellie isn't one feature, it's a
glanceable surface you can push anything to from your terminal, an agent,
or any MCP client. Here's a growing set of things to do with it. Each is
just a combination of the verbs (`update`, `flash`, `clear`, `send`); mix
them however you like, or invent your own.

Setup (CLI / MCP / raw URL scheme): see the repo root README and
`../mcp/README.md`.

## Recipes

- **⭐ [Make your AI agent narrate to your notch](narrate-to-your-notch.md)** —
  **start here.** The one that makes people get it: your agent shows what it's
  actually doing, live, in your notch, and hands you clickable links when it's
  done. Lifecycle + descriptive updates + clickable hand-offs + attention.
- **⭐ [Mine your Pulse Log](mine-your-pulse-log.md)** — Tellie keeps a private,
  local, plain-text JSONL of everything that ever pinged your notch. `jq` it for
  agent turn durations, reopen every link a tool handed you, `tail -f` for
  "needs you" alerts, or feed the day to an LLM for a standup. (Pro.)
- **[Agent lifecycle status](agent-lifecycle-status.md)** — auto-show when an
  AI agent is working vs idle, perfectly synced, via your harness's
  start/stop hooks (Claude Code, OpenClaw, etc.). The deeper hooks reference.
- **[Build / test status](build-test-status.md)** — wrap a build/test command
  so the notch shows progress + the result (red pulse on failure).
- **[Token + cost meter](token-cost-meter.md)** — a live tokens/cost/files
  meter in the notch while an agent works.
- **[Pomodoro / timer](pomodoro-timer.md)** — a focus countdown that ticks in
  the notch and nudges you when the interval ends.
- **[CI status in the notch](ci-to-notch.md)** — reflect a GitHub Actions run
  (or any webhook) so you stop babysitting a browser tab.
- **[Cheat sheets & reminders](cheat-sheet-reminders.md)** — park talking
  points or an agenda you can glance at, private on a screen share.
- **["Now reading"](now-reading.md)** — `send` a script and read it on camera
  with Voice Follow, for your next founder/launch video.
- **[Read the notch & coordinate agents](read-the-notch.md)** — read the live
  roster and history (`tellie status` / `log`, MCP `read_notch` / `read_log`)
  so a fleet of agents can avoid double-work or summarize the day.
- **[Agent fleet coordination](agent-fleet-coordination.md)** — mission
  control for many agents at once: each announces itself, checks the others
  before claiming work, hands off, and raises a hand when you're needed.

## Bring your own

The whole point: these are examples, not limits. You have `update` (set a
line), `flash` (transient), `clear` (remove), and `send` (load readable
content), each with a `source` name and an `icon` (SF Symbol or emoji). Go
build the glance you wish you had.
