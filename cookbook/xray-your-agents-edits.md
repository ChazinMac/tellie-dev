# X-ray your agent's file edits

You tell an agent "refactor the auth module" and it goes quiet for two minutes.
It's a black box: you have no idea which files it's touching, and you just have
to trust it isn't rewriting the wrong directory. This puts a live, silent
ticker of every file it changes right in your peripheral vision. Give the
command, go back to reading, and watch the notch quietly flash **Created**,
**Modified**, **Deleted** as it works. If you see it touch something it
shouldn't, you know to jump in. (Storm, an agent, invented this one too.)

## Why this one is different

Every other recipe asks the *agent* to narrate itself. This one watches the
**filesystem**, so it's completely agent-agnostic: it works with Claude Code,
Cursor, OpenClaw, a teammate, or a plain shell script, none of which need to
know Tellie exists. It turns the terrifying "black box" of autonomous coding
into a reassuring, ambient heartbeat. We use `tellie flash` (a transient pulse
that auto-clears after a few seconds), so the changes tick past instead of
piling up in the roster.

## 1. The flash handler

Save this as `tellie-xray-flash.sh` and `chmod +x` it. It maps a file event to
a labeled, icon'd flash. Needs Tellie + the `tellie` CLI (`npm i -g
@tellie/cli`).

```bash
#!/bin/bash
# tellie-xray-flash.sh <event> <path>  flash one file change to the notch.
case "$1" in
  add)              icon=sparkles; verb=Created  ;;
  unlink)           icon=trash;    verb=Deleted  ;;
  addDir|unlinkDir) exit 0 ;;                 # skip bare directory events
  *)                icon=pencil;   verb=Modified ;;
esac
tellie flash "$verb: $(basename "$2")" --source "File watch" --icon "$icon"
```

## 2. Point a watcher at your project

From your project root, watch everything *except* the noise. You already have
`node`, so `chokidar-cli` runs with zero install and emits clean `add` /
`change` / `unlink` events:

```bash
chmod +x tellie-xray-flash.sh

npx -y chokidar-cli "**/*" \
  --ignore "**/{.git,node_modules,dist,build,.next,coverage}/**" \
  --command "$PWD/tellie-xray-flash.sh {event} {path}"
```

Now point any agent at the repo and watch your notch. The `--ignore` line is
the whole game: skip it and one `npm install` or build will flood your notch
with thousands of flashes. If a fast refactor feels too busy, add
`--throttle 300` (chokidar coalesces bursts).

## Prefer no node dep? Use fswatch

If you'd rather stay Mac-native, `fswatch` (`brew install fswatch`) does the
same, recursively, with no node watcher:

```bash
fswatch -x -e "/\.git/" -e "node_modules" -e "/(dist|build)/" . | while read -r path flags; do
  case "$flags" in
    *Created*) icon=sparkles; verb=Created  ;;
    *Removed*) icon=trash;    verb=Deleted  ;;
    *)         icon=pencil;   verb=Modified ;;
  esac
  tellie flash "$verb: $(basename "$path")" --source "File watch" --icon "$icon"
done
```

## Good to know

- **Agent-agnostic is the superpower.** It watches files, not the agent, so it
  reports on any tool, even ones that have never heard of Tellie. That's real
  oversight, not self-reported.
- **The ignore list is mandatory.** Without it, builds and installs bury the
  signal. Tune it to your stack (add `target`, `.venv`, `vendor`, etc.).
- **Bursts are a feature.** `flash` auto-clears, so a flurry of edits reads as
  a heartbeat, not clutter. Throttle only if you want to.
- **It's free.** Just the `flash` verb and a standard file watcher, no Pro
  required.

Live version: <https://tellieapp.com/developers/cookbook/xray-your-agents-edits>

See also: [Make your AI agent narrate to your notch](narrate-to-your-notch.md),
[Build / test status](build-test-status.md).
