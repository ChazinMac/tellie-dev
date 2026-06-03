# Recipe: Cheat sheets & reminders

Park talking points, a meeting agenda, or a quick reminder where you can
glance at it, without a Notes window stealing screen space on a call.

## A glanceable reminder

```bash
tellie update "Ask about the Q3 numbers" --source Reminder --icon lightbulb
```

## A full cheat sheet you can read

`send` loads readable content; the strip shows a preview, and you click the
notch to expand and read it (or hover to peek).

```bash
tellie send --file ~/standup.md --source Standup
# or inline:
tellie send "1) status  2) blockers  3) asks" --source Standup
```

## Timed nudge before a meeting

```bash
( sleep $((5*60)); tellie update "Standup in 5" --source Calendar --icon calendar --attention ) &
```

## Notes

- `update` for a one-line glance; `send` when there's something to actually
  read (it's expandable and Voice-Follow-able).
- Tellie's window is excluded from screen recording, so a cheat sheet
  parked during a Zoom share stays private to you.
