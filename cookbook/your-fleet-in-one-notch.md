# Your fleet of agents, in one notch

You run a team of agents: Claude on your laptop, another on your Studio, maybe
two on one machine. This is how the notch taps you the moment any of them
finishes or needs you, no matter which Mac it ran on. One command, and you
never babysit a terminal again.

## 1. One command

For Claude Code, a single command wires its lifecycle hooks so the notch taps
you automatically:

```bash
npx -y @tellie/cli setup claude-code
```

Start a long task and walk away. When Claude finishes something you waited on,
or stops to ask you a question, your notch taps you. Quick replies stay quiet
(a finish only taps if the task ran 45 seconds or more), so it's signal, not
noise. Undo anytime with `setup claude-code --off`.

## 2. Share across Macs (or a team): flip to Team

By default the feed is a **local** file, so one Mac with one or more agents
just works. That's **Solo** mode. To pull your fleet across *several* Macs (or
a teammate's) into one notch, flip the switch:

1. Open **Settings › Agent feed** and switch **Solo / Team** to **Team**.
2. Pick a folder that syncs: iCloud Drive when the Macs are all yours, Dropbox
   or a shared drive for a team. Tellie creates a `feed.jsonl` there, or
   *joins* the one already in it.
3. Do the same on every other Mac, pointing at the **same folder**. Each one
   after the first joins the existing feed.

That's the whole setup, no paths to type. The notch now reads `Claude` on the
left and the machine it ran on (`Steve's MacBook Pro`, `Mac Studio`) on the
right; the same agent on two Macs stays two distinct rows. Receiving is always
free, so a teammate just flips to Team on the same folder and gets pulled in.

**No CLI required.** In Team mode Tellie mirrors every pulse it gets, even a
plain `open tellie://…` (built into macOS), into the shared feed. So any agent
that can run a shell command shows up across the fleet with nothing installed.
And if you *do* use the CLI or the Claude Code hook, `--feed default`
automatically follows the Solo / Team toggle, so the one-liner from step 1 just
works in Team mode with no path. Need an explicit path anyway (CI, a non-synced
share)? Pass it:

```bash
npx -y @tellie/cli setup claude-code --feed ~/Dropbox/team/feed.jsonl
```

## 3. Anything can post to it

The feed is plain text you own (JSONL). Anything that can append a line shows
up: CI, a cron job, an iPhone Shortcut, any agent. `--origin` tags where it
came from.

```bash
# the CLI, from any machine
tellie flash "prod deploy passed" --source CI --origin "build-server" --feed default

# or append a line of JSON yourself
{"ts":1752505331,"source":"Claude","origin":"Mac Studio","text":"tests green"}
```

In Solo mode the watched file is local:
`~/Library/Application Support/Tellie/feed.jsonl`. Flip to Team (step 2) and it
becomes the shared `feed.jsonl` in the folder you picked; `--feed default`
follows the toggle either way.

## Good to know

- **Latency is sync speed** (seconds), perfect for "done / needs review /
  heads-up." Tellie is glanceable status, not a chat app.
- **Fleet links open locally.** The "Claude finished" / "Claude needs you" rows
  carry a jump-back link that opens Claude Desktop on *whichever Mac you click
  it from*. That's most useful on the machine where that Claude is actually
  running; on the rest of the fleet the row is informational (the origin label
  tells you whose it is).
- **It's a primitive.** Point a capable agent at
  [llms.txt](https://tellieapp.com/llms.txt) and say "Tellie me," and it works
  the rest out on its own.

Live version: <https://tellieapp.com/developers/cookbook/your-fleet-in-one-notch>

See also: [Make your AI agent narrate to your notch](narrate-to-your-notch.md),
[Agent fleet coordination](agent-fleet-coordination.md),
[Read the notch & coordinate agents](read-the-notch.md).
