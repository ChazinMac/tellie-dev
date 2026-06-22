# Get pinged on your phone when agents finish

Your notch is great, but only when you're looking at it. This bridges it to
your phone: when any agent finishes a task (or hits a wall and needs you), you
get a ping. Start a long job, go to the gym, and your phone taps you when it's
done. An agent named Storm actually invented this, watching the Pulse Log and
forwarding only the lines that matter, no SDK required.

## How it works

Tellie Pro records every line that hits your notch to a local, append-only
JSONL file (the **Pulse Log**). A tiny watcher tails it, keeps only the lines
worth interrupting you for (a completion, a flash, or an `attention` pulse),
and forwards those to your phone. Every "Thinking…" stays on the notch where
it belongs.

## 1. Make a Telegram bot

Message `@BotFather` on Telegram, send `/newbot`, and it hands you a **bot
token**. Then message your new bot once (anything), and grab your **chat id**
from `@userinfobot`. Export both:

```bash
export TELLIE_TG_TOKEN="123456:ABC-your-bot-token"
export TELLIE_TG_CHAT="987654321"
```

## 2. The watcher

Save this as `tellie-phone.sh`. It polls today's Pulse Log every few seconds,
forwards only the interesting lines, and rolls over at midnight on its own.
Needs `jq` and `curl` (both standard).

```bash
#!/bin/bash
# Ping your phone when an agent finishes (or needs you).
DIR="$HOME/Library/Application Support/Tellie/PulseLog"
OFFSET=0; LAST=""

while true; do
  FILE="$DIR/$(date +%F).jsonl"
  # New day: start from the end so we don't replay history.
  [ "$FILE" != "$LAST" ] && { OFFSET=$(wc -l <"$FILE" 2>/dev/null || echo 0); LAST="$FILE"; }
  [ -f "$FILE" ] || { sleep 3; continue; }
  TOTAL=$(wc -l <"$FILE")
  if [ "$TOTAL" -gt "$OFFSET" ]; then
    tail -n +$((OFFSET+1)) "$FILE" | while IFS= read -r line; do
      # keep only: attention pulses, flashes, or completion words
      echo "$line" | jq -e 'select(.attention==true or .kind=="flash" or (.text|test("done|finished|ready|success|complete";"i")))' >/dev/null 2>&1 || continue
      MSG=$(echo "$line" | jq -r '"\(.source // "agent"): \(.text)"')
      curl -s "https://api.telegram.org/bot$TELLIE_TG_TOKEN/sendMessage" \
        --data-urlencode "chat_id=$TELLIE_TG_CHAT" --data-urlencode "text=$MSG" >/dev/null
    done
    OFFSET=$TOTAL
  fi
  sleep 3
done
```

Run it once to test (`chmod +x tellie-phone.sh && ./tellie-phone.sh`), then
have an agent Tellie you "done" and check your phone.

## 3. Keep it running in the background

So it survives reboots and runs while you're away, load it as a LaunchAgent.
Save as `~/Library/LaunchAgents/com.you.tellie-phone.plist` (set the path +
your token/chat), then load it:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.you.tellie-phone</string>
  <key>ProgramArguments</key>
  <array><string>/bin/bash</string><string>/Users/you/tellie-phone.sh</string></array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>TELLIE_TG_TOKEN</key><string>123456:ABC-your-bot-token</string>
    <key>TELLIE_TG_CHAT</key><string>987654321</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
</dict></plist>
```

```bash
launchctl load ~/Library/LaunchAgents/com.you.tellie-phone.plist
```

## Prefer no account? Use ntfy.sh

Don't want a Telegram bot? [ntfy.sh](https://ntfy.sh) needs no account: pick a
hard-to-guess topic, install the ntfy app, subscribe to it, and swap the `curl`
line in the watcher for this. It's also self-hostable, so you can keep the
whole thing on infrastructure you own.

```bash
curl -s -d "$MSG" "https://ntfy.sh/your-secret-topic-name" >/dev/null
```

## Good to know

- **This is the one place Tellie data leaves your Mac.** Everything else is
  on-device; a phone bridge by definition sends a line to a push service
  (Telegram, ntfy). If that matters to you, **self-host ntfy** and it stays
  entirely yours.
- **It reads the Pulse Log, which Tellie records under Pro.** The live notch
  and the verbs are free; the persistent history this watches is the Pro part.
- **Tune the filter.** The `test("done|finished|...")` keywords and the
  `attention`/`flash` rules are yours to adjust, narrow them so only the pings
  you actually care about reach your pocket.

Live version: <https://tellieapp.com/developers/cookbook/notify-your-phone>

See also: [Mine your Pulse Log](mine-your-pulse-log.md),
[Make your AI agent narrate to your notch](narrate-to-your-notch.md).
