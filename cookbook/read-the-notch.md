# Recipe: Read the notch (and coordinate agents)

Tellie isn't only write-only. It also exposes what's on the notch so agents
and scripts can *read* it: the live roster right now, and the recent
history. That turns the notch into a tiny shared coordination surface for a
fleet of agents.

Two local files back this (no API, no network):

- `~/Library/Application Support/Tellie/state.json` — the live roster
  snapshot. Always written. **Free.**
- `~/Library/Application Support/Tellie/TellieLog/YYYY-MM-DD.jsonl` — the
  rolling daily history. Written only when **Tellie Pro** is active.

## Read the current state

CLI:

```bash
tellie status                 # human-readable
tellie status --json          # raw JSON for scripting
```

MCP (from an agent): call `read_notch` (no arguments). It returns the live
roster + any parked send.

## Read the history

```bash
tellie log                                   # last 24h, last 20 entries
tellie log --source CI --since 6h            # just CI, last 6 hours
tellie log --day 2026-06-03 --json           # a specific day, raw JSON
```

MCP: call `read_log` with optional `source`, `sinceHours`, `limit`.

## Coordinate a fleet (don't double-work)

Before an agent starts a job, it can check whether another agent is already
on it, by reading the live roster:

```bash
if tellie status --json | jq -e '.roster[] | select(.source=="builder")' >/dev/null; then
  echo "builder is already running; skipping."
else
  tellie update "Building…" --source builder --icon hammer
  # ...do the build...
  tellie clear --source builder
fi
```

An MCP agent does the same with `read_notch`: look for your source in the
roster before claiming the task, and `clear` it when done.

## Summarize your day

```bash
tellie log --since 24h --json | jq -r '.[] | "\(.source): \(.text)"'
```

Or ask an agent: "Read my Tellie history for the last few hours and write me
a standup." It calls `read_log` and summarizes.

## Notes

- `status` / `read_notch` are free (live glance). `log` / `read_log` return
  history only when Tellie Pro is recording.
- Reads never touch the notch; they only read local files.
