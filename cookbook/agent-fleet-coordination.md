# Recipe: Agent fleet coordination (mission control)

Run several agents at once (different terminals, different Macs driving the
same notch, a swarm on one machine) and let them **see each other** through
the notch. Each agent announces what it's doing, and any agent can read the
roster to check what the others are up to before acting. The notch becomes a
shared status board for your fleet.

This builds on two ideas:
- **Write:** each agent posts its status with its own `source` name
  (`update` / `flash`).
- **Read:** any agent reads the live roster (`read_notch` / `tellie status`)
  or the history (`read_log` / `tellie log`) to see the others.

## Each agent announces itself

Give every agent a distinct source and icon so the roster reads like a
team roster:

```bash
tellie update "Refactoring auth…" --source agent-1 --icon person.crop.circle
tellie update "Writing tests…"    --source agent-2 --icon checklist
tellie update "Indexing docs…"    --source agent-3 --icon book
```

Hover the notch and you see all three at once, newest on top, each with how
long ago it last reported.

## Check before you claim (no double-work)

Before an agent starts a shared task, it reads the roster to see if another
agent is already on it. CLI:

```bash
# Is anyone already building?
if tellie status --json | jq -e '.roster[] | select(.text | test("[Bb]uild"))' >/dev/null; then
  echo "another agent is building; I'll do something else."
else
  tellie update "Building…" --source $AGENT --icon hammer
  # ...build...
  tellie clear --source $AGENT
fi
```

From an MCP agent, the same logic: call `read_notch`, look for a matching
source or text in the roster, and only claim the task if it's free.

## Hand off and watch for "done"

One agent finishes and flags the next:

```bash
# agent-1 finishes its part
tellie flash "auth done → tests can start" --source agent-1 --icon checkmark.circle
```

Another agent polls the history for that signal:

```bash
# agent-2 waits until auth is reported done
until tellie log --source agent-1 --since 10m --json | jq -e '.[] | select(.text | test("done"))' >/dev/null; do
  sleep 5
done
tellie update "Auth is done, starting tests" --source agent-2 --icon checklist
```

## Raise a hand when a human is needed

Any agent can pulse the notch orange so you look up, even across the room:

```bash
tellie update "agent-3 blocked: needs API key" --source agent-3 --icon exclamationmark.triangle --attention
```

## "Give me the standup"

Point an agent at the history and let it summarize the fleet's morning:

```
"Read my Tellie history for the last 3 hours with read_log and write a
one-paragraph standup of what each agent did."
```

## Notes

- `status` / `read_notch` (live) are free. `log` / `read_log` (history) return
  data only when Tellie Pro is recording.
- Sources auto-expire from the live roster when an agent goes quiet (~5 min),
  so a crashed agent fades on its own; the history still has its trail.
- Naming agents consistently (`agent-1`, `builder`, `tester`) makes both the
  glance and the `--source` filters clean.

See also [Read the notch](read-the-notch.md) and
[Agent lifecycle status](agent-lifecycle-status.md).
