# @tellie/cli

A `tellie` command-line tool for [Tellie](https://tellieapp.com), the silent
second screen that lives in the Mac notch. Push a glanceable one-line status to
the notch from your terminal, a script, CI, or an AI agent, and read it back.
Thin wrapper over the public `tellie://` URL scheme: no private API, works
against any installed Tellie build, and encoding is handled for you.

Requires a Mac with Tellie installed and running. 100% free.

## Use

```bash
# push a status line (persists until you change or clear it)
npx @tellie/cli update "Building the auth module..." --source Claude --icon hammer
npx @tellie/cli update "Needs your review" --source Claude --icon checkmark.circle --attention

# a brief, self-clearing ping
npx @tellie/cli flash "Deployed" --source CI --link https://example.com/run

# park readable content in the notch (the teleprompter)
npx @tellie/cli send "You're on in 5 minutes" --source Calendar
npx @tellie/cli send --file ./script.md --source Drafts

# clear your line, or everything
npx @tellie/cli clear --source Claude
npx @tellie/cli dismiss

# read the notch back
npx @tellie/cli status --json          # the live roster, right now (free)
npx @tellie/cli log --source CI --since 6h   # history (recorded under Tellie Pro)

npx @tellie/cli --help
```

Installed globally (or via `npx`), the command is just `tellie ...`.

## Tap your notch when Claude Code is done

One command wires Claude Code's lifecycle hooks so the notch taps you the moment
Claude finishes or needs you. Hands-free, and quick replies stay quiet.

```bash
npx @tellie/cli setup claude-code        # install
npx @tellie/cli setup claude-code --off  # undo
```

## Your fleet of agents, in one notch

Tellie also watches a shared JSONL file (in iCloud Drive, Dropbox, Drive, or a
network share). Anything that appends a line shows up in the notch, so a fleet
of agents across machines, or a whole team, reports to one place. The shared
file is the channel: no server, no accounts.

```bash
# post into the default watched feed (the file Tellie already watches)
tellie flash "tests green" --source Claude --origin "Mac Studio" --feed default

# or a shared team file
tellie update "prod deploy passed" --source CI --icon checkmark.seal \
  --feed ~/Dropbox/team/feed.jsonl

# point the Claude Code hook at a shared team file
tellie setup claude-code --feed ~/Dropbox/team/feed.jsonl
```

`--source` is the agent (the left label in the notch). `--origin` is where it
came from, a machine or a person (the right label), so a fleet stays distinct.

## Flags

| Flag | Used by | Meaning |
| --- | --- | --- |
| `--source NAME` | all | Who is posting (the label and color key). |
| `--icon SYMBOL` | update/flash/send | An SF Symbol name (`hammer`, `checkmark.circle`) or one emoji. |
| `--attention` | update | Pulse orange: "look at me," you are the blocker. |
| `--link URL` | update/flash | Make the row clickable (opens the URL). |
| `--app BUNDLE` | update/flash | Launch an app on click instead of a URL. |
| `--feed PATH` | update/flash | Append to a shared feed file (`default` = the watched file). |
| `--origin NAME` | update/flash (feed) | Where it came from (machine/person), shown right-justified. |
| `--origin-icon SYMBOL` | update/flash (feed) | SF Symbol for the origin (laptop by default; `person.fill` for a person). |

## Feed file format

One JSON object per line (JSONL). Minimum is `ts` (unix seconds) or `iso`, plus
`text`:

```json
{"ts":1752505331,"source":"Claude","origin":"Mac Studio","text":"tests green","icon":"checkmark.circle","attention":false}
```

Fields: `ts` or `iso`, `text`, `source`, `origin`, `originIcon`, `icon`, `link`,
`attention`, `kind` (`update` or `flash`). The default watched file is local:
`~/Library/Application Support/Tellie/feed.jsonl`. For a fleet across Macs or a
team, point `--feed` at the same shared-folder file (Dropbox/Drive/iCloud) on
each machine.

## More

Full reference and the agent-readable docs: <https://tellieapp.com/developers>
and <https://tellieapp.com/llms.txt>.
