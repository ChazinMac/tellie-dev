# Recipe: "Now reading" (teleprompter for your video)

The dev tools push *content*, not just status, so the same `send` that hands
an agent's output to your notch also loads a script you can read on camera.
Great for your next founder/demo/launch video.

## Load a script and read it

```bash
tellie send --file ~/pitch.md --source Script
```

Then click the notch to expand the full teleprompter, turn on **Voice
Follow**, and hit record, the script scrolls at your speaking pace, and the
current word is highlighted so your eyes stay near the camera.

## Hand it off from an agent

The loop that makes this magic: ask your agent to write the script and load
it, then you just read.

```
"Turn this README into a 60-second pitch and send it to Tellie."
```

The agent calls `send_to_tellie(text, source)`, the script lands in your
notch, you expand and record. Zero copy-paste.

## Notes

- `send` is teleprompter mode (readable, scrollable, Voice-Follow-able), as
  opposed to `update`/`flash` which are glanceable status lines.
- Tellie's window is excluded from screen recording, so the teleprompter
  won't show up in your screen capture.
