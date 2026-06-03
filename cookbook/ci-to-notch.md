# Recipe: CI status in the notch

Reflect a CI run in your notch from your Mac, so you don't babysit a
browser tab waiting for the build.

## GitHub Actions (via the `gh` CLI)

```bash
tellie update "CI running…" --source GitHub --icon gearshape
RUN_URL=$(gh run view --json url -q .url 2>/dev/null)
if gh run watch --exit-status; then
  tellie flash "CI green" --source GitHub --icon checkmark.circle
else
  tellie update "CI failed, look" --source GitHub --icon xmark.octagon --attention --link "$RUN_URL"
fi
```

`gh run watch` blocks until the latest run finishes, so this whole thing
just sits quietly and pings your notch when it's done. The `--link` on the
failure line makes the notch row clickable: hover the notch, click it, and
the failed run opens in your browser. No tab to hunt for.

## Any webhook / remote signal

CI runs off-machine, but the notch is local, so the pattern is: a small
local listener turns the signal into a `tellie` call. Minimal example with
`nc`:

```bash
# toy local receiver: POST anything to localhost:8787 -> flashes the notch
while true; do
  printf 'HTTP/1.1 200 OK\r\n\r\n' | nc -l 8787 >/dev/null
  tellie flash "Webhook received" --source Hook --icon bolt
done
```

Point a tunnel (ngrok, Tailscale, etc.) at it, or call it from another
local tool. The principle: anything that can run a shell command can light
up your notch.
