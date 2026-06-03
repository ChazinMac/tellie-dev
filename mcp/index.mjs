#!/usr/bin/env node
// Tellie MCP server (spike).
//
// Exposes Tellie's silent second screen (the Mac notch) to MCP-aware AI
// clients like Claude Desktop. v0 has one tool, send_to_tellie, which
// wraps the existing `tellie://send` URL scheme (the same surface the
// Send to Tellie hotkey and INTEGRATIONS.md document). No private API:
// it just `open`s a tellie:// URL, so it works against any installed
// Tellie build. Steve 2026-06-02.
//
// Run: node index.mjs   (speaks MCP over stdio)
// Wire into Claude Desktop: see README.md.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { execFile } from "node:child_process";

const server = new McpServer({ name: "tellie", version: "0.0.1" });

/** Open a tellie:// URL via macOS `open`, resolving when it returns. */
function openTellieURL(url) {
  return new Promise((resolve, reject) => {
    execFile("open", [url], (err) => (err ? reject(err) : resolve()));
  });
}

server.registerTool(
  "send_to_tellie",
  {
    title: "Send to Tellie",
    description:
      "Display text on Tellie's silent second screen in the Mac notch. " +
      "Tellie parks the text quietly in the notch (it does not steal focus " +
      "or take over the screen); the user clicks the notch to read it as a " +
      "teleprompter. Use this to hand the user a script, talking points, or " +
      "a note to read aloud or refer to while they keep working.",
    inputSchema: {
      text: z.string().describe("The text to display in Tellie."),
      source: z
        .string()
        .optional()
        .describe(
          "Optional short attribution shown beside the notch, e.g. 'Claude'."
        ),
    },
  },
  async ({ text, source }) => {
    if (!text || !text.trim()) {
      return {
        isError: true,
        content: [{ type: "text", text: "No text provided to send." }],
      };
    }
    // Encode with encodeURIComponent (spaces -> %20), NOT URLSearchParams
    // (which encodes spaces as "+"). Tellie's URL parser treats "+" as a
    // literal plus and only decodes %20 to a space, so URLSearchParams made
    // "+" show up in the notch. %20 is also what INTEGRATIONS.md documents.
    let url = `tellie://send?text=${encodeURIComponent(text)}`;
    if (source && source.trim()) url += `&source=${encodeURIComponent(source)}`;
    try {
      await openTellieURL(url);
      return {
        content: [
          {
            type: "text",
            text: `Sent ${text.length} characters to Tellie's notch${
              source ? ` (from ${source})` : ""
            }.`,
          },
        ],
      };
    } catch (err) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Could not reach Tellie: ${String(err)}. Is Tellie installed and running?`,
          },
        ],
      };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
