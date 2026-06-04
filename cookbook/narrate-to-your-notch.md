# Make your AI agent narrate to your notch

**Start here.** This is the one that makes people get it: your AI agent shows
what it's *actually doing*, live, in your Mac notch, and hands you clickable
links when it's done. No alt-tabbing to a terminal to see if it's still
working. You just glance up.

It's two layers: an automatic lifecycle (turn start/end) you set once, and
descriptive updates the agent sends as it works.

## 1. Automatic: "Thinking…" → "Done" (set once)

Most agent harnesses can run a command on turn start and turn end. In Claude
Code, that's hooks. Drop this in `~/.claude/settings.json` (global) or a
project's `.claude/settings.local.json`:

```json
{
  "hooks": {
    "UserPromptSubmit": [{ "hooks": [{ "type": "command",
      "command": "open -g \"tellie://update?text=Thinking%E2%80%A6&source=Claude&icon=sparkles\"" }]}],
    "Stop": [{ "hooks": [{ "type": "command",
      "command": "open -g \"tellie://flash?text=Done&source=Claude&icon=checkmark.circle\"" }]}]
  }
}
```

Every prompt flips the notch to "Thinking… ✨ Claude"; every finished turn
flashes "Done," perfectly synced to the model's real generation. Hooks reload
on the next turn, no restart.

## 2. Descriptive: say what you're actually doing

"Thinking…" is fine, but the magic is watching the agent narrate. Have it
post a real status at each milestone (in Claude Code, just let the model run
the command as a step):

```bash
open -g "tellie://update?text=Building%20the%20Pro%20page&source=Claude&icon=hammer"
open -g "tellie://update?text=Running%20tests%20(24%2F40)&source=Claude&icon=checklist"
open -g "tellie://update?text=Opening%20the%20PR&source=Claude&icon=arrow.triangle.pull"
```

Now your notch reads like a ticker of the agent's mind.

## 3. Hand off links you can click

When the agent produces something you'll want to open, a PR, a deploy, a
preview, push it as a **clickable** row with `link=`. Hover the notch, click,
it opens:

```bash
open -g "tellie://update?text=Merge%3A%20%2Fpresenter&source=PR%20176&icon=arrow.triangle.pull&link=https%3A%2F%2Fgithub.com%2Fowner%2Frepo%2Fpull%2F176"
```

Hand off a whole list at once (one row per item, distinct `source`) and your
notch becomes a clickable to-do queue the agent built for you.

## 4. Raise a hand when it needs you

Blocked, or waiting on a decision, while you're across the room? Pulse it
orange:

```bash
open -g "tellie://update?text=Need%20your%20call%20on%20the%20name&source=Claude&icon=bell&attention=1"
```

Use it sparingly so the orange always means "look up." Clear a line when it's
resolved: `open -g "tellie://clear?source=Claude"`.

## The four rules that keep it polite

- **Always `open -g`** (background). Without it, `open` foregrounds Tellie and
  steals keyboard focus from whatever you're typing in.
- **Percent-encode** text and links (spaces = `%20`). The `tellie` CLI does
  this for you if you'd rather not.
- **One `source` per agent.** Same source updates its line in place; different
  sources stack into the roster (hover the notch to peek the whole fleet).
- **Clear when done**, or let it auto-expire. The notch should never show
  stale state.

## Works with any agent

This is just the `tellie://` URL scheme, so anything that can run a shell
command can do it: Claude Code, OpenClaw, Cursor, a Makefile, a git hook,
your own harness. Give your tools a face.

See also: [Agent lifecycle status](agent-lifecycle-status.md),
[Read the notch & coordinate agents](read-the-notch.md),
[Agent fleet coordination](agent-fleet-coordination.md).
