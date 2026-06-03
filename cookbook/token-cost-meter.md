# Recipe: Token + cost meter

Keep a live count of tokens / cost / files-changed in the notch while an
agent works, so you can glance at the meter instead of digging through logs.

## From an MCP agent

Have the agent call `update_status` whenever its running totals change
(replaces the previous line, same `source`):

```
update_status({
  text: "142k tokens · $0.38 · 4 files",
  source: "Claude",
  icon: "number"
})
```

## From a script / CLI

```bash
tellie update "142k tokens · \$0.38 · 4 files" --source Claude --icon number
```

## Notes

- Because `update` replaces in place (keyed by `source`), you can fire it as
  often as you like, the meter just updates; it never piles up.
- Pair with the [agent lifecycle](agent-lifecycle-status.md) recipe so the
  meter clears when the turn ends.
- End with a milestone: `tellie flash "Done · 198k tokens · \$0.51" --source Claude --icon checkmark.circle`.
