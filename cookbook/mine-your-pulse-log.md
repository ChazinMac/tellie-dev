# Mine your Pulse Log

Tellie keeps a private, local record of everything that ever pinged your
notch. It's plain **JSONL**, one self-contained JSON object per line, in:

```
~/Library/Application Support/Tellie/PulseLog/YYYY-MM-DD.jsonl
```

One file per day, 30-day rolling, never leaves your Mac. Because it's JSONL,
you don't need an API or a database, just `jq`, `grep`, `tail`, and `awk`.

Each line looks like:

```json
{"ts":1780596192.77,"iso":"2026-06-04T14:03:12-04:00","source":"PR 182",
 "text":"Presenter polish (ship now)","kind":"update","icon":"arrow.triangle.pull",
 "attention":false,"link":"https://github.com/you/repo/pull/182"}
```

Fields: `ts` (unix), `iso` (local time), `source`, `text`, `kind`
(`update`/`flash`), `icon`, `attention` (bool), and an optional `link`.

A shortcut for "today's file":

```bash
LOG=~/Library/Application\ Support/Tellie/PulseLog/$(date +%F).jsonl
```

## Who pushed what (activity by source)

```bash
jq -r '.source' "$LOG" | sort | uniq -c | sort -rn
```

## Every link an agent handed you today

The killer one. Scroll back and reopen any PR, preview, or deploy URL a tool
surfaced, with timestamps:

```bash
jq -r 'select(.link) | "\(.iso[11:16])  \(.text)  ->  \(.link)"' "$LOG"
```

## Agent turn durations (and total active time)

Pair each `Thinking…` with the next `Done` to measure how long your agent
actually worked:

```bash
jq -r 'select(.text=="Thinking…" or .text=="Done") | "\(.ts) \(.text)"' "$LOG" \
| awk '
  /Thinking/ {start=$1; next}
  /Done/ && start {printf "%6.1fs  turn\n", $1-start; total+=$1-start; start=0}
  END {printf "----\n%.1f min of active agent work\n", total/60}'
```

## Everything one source said

```bash
jq -r 'select(.source=="Claude") | "\(.iso[11:16])  \(.text)"' "$LOG"
```

## Watch for "needs you" in real time

Because the file is append-only, `tail -f` it and react the instant any
agent raises a hand (`attention=1`):

```bash
tail -f "$LOG" | jq -rc --unbuffered 'select(.attention==true) | .text' \
| while read -r msg; do
    say "Tellie needs you: $msg"        # or curl a Slack webhook, etc.
  done
```

## A standup from a log you never had to keep

Pipe the day to an LLM and let it summarize what you and your agents did:

```bash
cat "$LOG" | llm "Summarize what happened today as a short standup update."
```

## Roll up the whole month

```bash
cat ~/Library/Application\ Support/Tellie/PulseLog/*.jsonl \
| jq -r 'select(.link) | .link' | sort -u
```

That's the point: the log is yours, it's grep-able, and it never leaves your
Mac. The Pulse Log is a Tellie Pro feature.

See also: [Make your AI agent narrate to your notch](narrate-to-your-notch.md),
[Read the notch & coordinate agents](read-the-notch.md).
