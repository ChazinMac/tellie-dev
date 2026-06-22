# Teach your agent to Tellie me

The fastest way to make your notch come alive: don't wire anything up, just
tell your AI what you want. A capable agent reads the docs and runs with it,
narrating its work and handing you clickable links, so you stop flipping to
the terminal to check on it.

## What you need: just the app

Nothing to install for your agent. It talks to the notch with
`open -g "tellie://..."`, which is built into macOS, so any agent that can run
a shell command does it with zero setup. (That is exactly how Storm, an
OpenClaw agent, does it; it never needed a CLI.) The whole thing:

1. Install the **Tellie app** (it lives in your Mac's notch).
2. Tell your agent the line below, and point it at
   [llms.txt](https://tellieapp.com/llms.txt).
3. That's it. It starts narrating and handing you clickable links.

Optional, only if you'd rather your agent use the cleaner `tellie` command (it
auto-encodes for you): install it once with one line,
`npm install -g @tellie/cli`. Not required for any of the above.

## Say this to your agent

Paste this once, or add it to your agent's standing instructions (a Claude
Code `CLAUDE.md`, a Cursor rule, your own harness prompt):

```
Use your terminal/shell tools to Tellie me what you're doing as you work, and
hand me any links (PRs, previews, deploys) as clickable rows in my notch. Read
https://tellieapp.com/llms.txt to learn the commands, and make this a
permanent habit.
```

That's it. A capable agent reads the page and works out the rest: it posts
live status as it goes, and the moment it has something for you to open, it
hands it over as a row you can click.

## Why it works

- **[llms.txt](https://tellieapp.com/llms.txt) is written for the agent.** It
  teaches the `tellie://` verbs, clickable `link=` rows, the attention pulse,
  and a lifecycle habit. Point a capable agent at it once and it self-serves.
- **One actually did.** Storm, an OpenClaw agent, picked up the whole scheme
  from the docs cold and made it a permanent habit, even handing back doc links
  unprompted.
- **It's a primitive, not a fixed integration.** Any agent that can run a shell
  command can do it: Claude Code, Cursor, OpenClaw, your own harness.

## Want the finish-tap automatic too?

For Claude Code, one command also taps your notch the moment it finishes or
needs you, hands-free:

```bash
npx -y @tellie/cli setup claude-code
```

But the magic is the **rich** pulses, the live status and the links, and those
come from telling your agent the instruction above. The automatic hook only
knows that a turn ended, not what your agent actually did.

Live version: <https://tellieapp.com/developers/cookbook/teach-your-agent-to-tellie-me>

See also: [Make your AI agent narrate to your notch](narrate-to-your-notch.md)
(the hands-on version), [Your fleet in one notch](your-fleet-in-one-notch.md).
