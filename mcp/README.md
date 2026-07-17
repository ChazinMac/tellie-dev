# @tellie/mcp

An MCP server that lets AI clients (Claude Desktop, etc.) push text to
**Tellie's silent second screen** in the Mac notch. It wraps the public
`tellie://` URL scheme (documented in Tellie's INTEGRATIONS.md), so it needs
no private API and works against any installed Tellie build.

## Tools

- **`update_status(text, source?, icon?, attention?)`** — set/replace a
  glanceable status line in the notch (build step, tokens, a timer,
  anything). Replaces the previous line from the same source; never steals
  focus. `attention: true` is the "look up / needs you" cue. `icon` is an
  SF Symbol name (`hammer`, `checkmark.circle`, `bolt`) or an emoji.
- **`flash_status(text, source?, icon?)`** — a brief status that auto-clears
  (one-off pings / milestones).
- **`clear_notch(source?)`** — remove one source's line (sign off) with
  `source`, or clear everything without it.
- **`send_to_tellie(text, source?)`** — load readable content as a
  teleprompter script (click the notch to read it full).

## Run / test locally

```bash
cd tellie-dev/mcp
npm install
node test-client.mjs   # lists the tool, calls it; Tellie should show the strip
```

(Tellie must be installed and running.)

## Wire into Claude Desktop

Add this to `~/Library/Application Support/Claude/claude_desktop_config.json`
(create the file if it doesn't exist), then fully quit and reopen Claude
Desktop:

```json
{
  "mcpServers": {
    "tellie": {
      "command": "npx",
      "args": ["-y", "@tellie/mcp"]
    }
  }
}
```

That uses the published package; npm fetches and runs it for you, no clone needed.

Prefer to run from a local clone? Point `command` at `node` and `args` at the
absolute path to `mcp/index.mjs`:

```json
{
  "mcpServers": {
    "tellie": {
      "command": "node",
      "args": ["/absolute/path/to/tellie-dev/mcp/index.mjs"]
    }
  }
}
```

Then ask Claude, in Claude Desktop: *"Send 'testing one two three' to Tellie."*
It should call `send_to_tellie` and the text should appear in your notch.

> Once published, this becomes `npx -y @tellie/mcp` instead of a hardcoded
> path, so users won't need a local checkout.
