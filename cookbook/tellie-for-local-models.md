# Tellie for local-model tools (LM Studio, OpenClaw)

Running models on your own Mac, LM Studio, OpenClaw, an Ollama-driven agent, can
push to your notch exactly like Claude does. Pick the path that matches the tool:
MCP for model runners, the CLI or URL scheme for agent frameworks. Needs Tellie.
No accounts, no keys, all on-device.

## LM Studio (and any MCP client)

LM Studio speaks MCP, so one command wires Tellie in as a server:

```bash
npx -y @tellie/cli setup lmstudio
```

That adds Tellie to `~/.lmstudio/mcp.json` (it backs up first and leaves your
other servers alone). Then:

1. Fully quit and reopen LM Studio so it re-reads the config.
2. Load a tool-calling model on the same Mac.
3. In the chat, click the **wrench icon** in the message bar to switch
   `mcp/tellie` on for the conversation.
4. Ask it to "call the update_status tool," and approve the call.

**GUI apps need the full path to `npx`.** LM Studio (and most desktop MCP
clients) launch with a minimal PATH that doesn't include nvm or Homebrew node,
so a bare `npx` won't spawn and the server silently never appears. `setup
lmstudio` writes the absolute path for you. If you wire it by hand, run `which
npx` and use that full path as the `command`.

Prefer to wire it by hand, or using Claude Desktop / Cursor / another MCP
client? Drop this into that client's MCP config:

```json
{
  "mcpServers": {
    "tellie": { "command": "npx", "args": ["-y", "@tellie/mcp"] }
  }
}
```

## OpenClaw (and any agent that runs commands)

An OpenClaw agent already has everything it needs: a shell. There's nothing to
wire, just have it run the CLI or the raw URL scheme.

```bash
tellie update "Refactoring the auth module…" --source OpenClaw --icon hammer
tellie flash  "Done" --source OpenClaw --icon checkmark.circle
```

The hands-off way: point the agent at <https://tellieapp.com/llms.txt> and say
"Tellie me." It learns the scheme cold (that's how the OpenClaw agent Storm
picked it up and made it a habit). For a permanent habit, add one Tellie line to
the agent's standing instructions.

## The model has to be able to call tools

For the MCP path, the local model needs to be reasonably good at tool-calling.
Qwen, Llama 3.x instruct, and similar handle it well; very small or base models
may not reliably make the call. If tool-calling is shaky, drive Tellie from the
harness instead: run the `tellie` CLI around the model call. That path doesn't
depend on the model at all, which is the whole point of a generic primitive.

## Good to know

- **It's all free.** The MCP server, the CLI, and the `tellie://` URL scheme are
  the free developer surface. Persistence (the Pulse Log) and pro surfaces are
  the paid part.
- **The URL scheme is the universal fallback.** Anything that can run
  `open -g "tellie://update?text=…"` can drive the notch: no install, no MCP,
  no CLI.
- **Same config, other clients.** The `@tellie/mcp` block works in Claude
  Desktop, Cursor, and other MCP clients too; only the config file path differs.
