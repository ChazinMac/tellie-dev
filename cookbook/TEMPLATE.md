<!-- Copy me to cookbook/your-recipe-name.md and fill in the blanks.
     Keep it short: the best recipes are a few lines you can paste and run.
     Then add a one-line entry for it under "## Recipes" in README.md. -->

# Recipe name

One or two sentences: what it does, and why it's nice to glance at in your notch.

**By:** your name or handle
**Needs:** `@tellie/cli` (`npm i -g @tellie/cli`) <plus any other tools, e.g. `jq`, `fswatch`>
**Pro?:** No <or: Yes, reads the Pulse Log>

## The recipe

```bash
# your script or one-liner
tellie update "..." --source "..." --icon "..."
```

## How to run it

How to start it, test it, and (if it's a watcher) keep it running in the background.

## Good to know

- Gotchas, knobs to tune, anything that floods the notch if you skip it.
- Which verb and why: `update` persists until changed, `flash` auto-clears.
