# @tellie/mcp (spike)

An MCP server that lets AI clients (Claude Desktop, etc.) push text to
**Tellie's silent second screen** in the Mac notch. It wraps the public
`tellie://` URL scheme (see `../../INTEGRATIONS.md`), so it needs no private
API and works against any installed Tellie build.

Status: **spike**. One tool, `send_to_tellie`. Proven end to end on
2026-06-02 (see `test-client.mjs`). The full tool set (play/pause/reset,
update_notch, etc.) and npm publishing come next; see the roadmap's "Tellie
for Developers" section.

## Tools

- **`send_to_tellie(text, source?)`** — display `text` in the notch.
  `source` is an optional short attribution shown beside the notch.

## Run / test locally

```bash
cd dev-tools/mcp
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
      "command": "node",
      "args": [
        "/Users/stevechazin/Desktop/Personal AI Projects/NotchTeleprompter/dev-tools/mcp/index.mjs"
      ]
    }
  }
}
```

Then ask Claude, in Claude Desktop: *"Send 'testing one two three' to Tellie."*
It should call `send_to_tellie` and the text should appear in your notch.

> Once published, this becomes `npx -y @tellie/mcp` instead of a hardcoded
> path, so users won't need a local checkout.
