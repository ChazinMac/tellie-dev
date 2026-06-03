# Recipe: Agent lifecycle status (Thinking… → idle)

Make your notch show, automatically and in perfect sync, when an AI agent
is working vs done, with zero per-message effort.

## The problem

Marking "working" is easy: an agent fires `update` as its first tool call.
Marking "done/idle" is hard: an agent's last act is streaming text to you,
with no tool call after it, so it can't cleanly signal "I finished." The
notch ends up showing a stale state ("Standing by" while still talking).

## The principle

Idle/done detection belongs in the agent's **harness** (the runtime around
the model), not in the agent's own output and not in Tellie. The harness
knows exactly when a turn starts and ends. So:

- **Turn starts** → tell Tellie the agent is working.
- **Turn ends** → clear the agent's line (or set it to idle).

Most harnesses already expose these as lifecycle hooks.

## Claude Code

Claude Code has `UserPromptSubmit` (turn start) and `Stop` (turn end) hooks.
Add this to `~/.claude/settings.json` (global) or a project's
`.claude/settings.local.json` (personal, per-project):

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          { "type": "command", "command": "open \"tellie://update?text=Thinking%E2%80%A6&source=Claude&icon=sparkles\"" }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          { "type": "command", "command": "open \"tellie://clear?source=Claude\"" }
        ]
      }
    ]
  }
}
```

Now every prompt flips the notch to "Thinking… ✨ Claude" and every finished
turn clears it, perfectly synced to the model's actual generation. Hooks
reload on the next turn; no restart needed.

(Prefer the CLI? Use `tellie update "Thinking…" --source Claude --icon
sparkles` and `tellie clear --source Claude` as the hook commands instead.)

## OpenClaw / any harness

Same pattern, wherever your harness lets you run a command on turn
start/end (a lifecycle hook, middleware, or wrapper):

- on receive / turn start: `open "tellie://update?text=Working%E2%80%A6&source=OpenClaw&icon=bolt"`
- on stream finish / turn end: `open "tellie://clear?source=OpenClaw"`

That takes the burden off the model to manage its own idle state and keeps
the notch 100% in sync with the engine.

## Heartbeat alternative (no harness hook)

If you can't hook the harness, have the agent re-`update` every few seconds
while it works (it's probably pushing progress anyway). Tellie's roster
auto-expires a source that goes quiet (~5 min), so a crashed agent fades on
its own. The harness hook is cleaner, but this works in a pinch.

## Bonus: richer states

`update` carries `icon` and `attention`, so you can do more than working/idle:

```
tellie update "Running tests… (12/40)" --source Claude --icon hammer
tellie update "Needs your review" --source Claude --icon checkmark.circle --attention
tellie flash  "PR #149 opened" --source Claude --icon bolt
```
