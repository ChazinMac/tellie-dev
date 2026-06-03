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

/** Open a tellie:// URL and return an MCP tool result (ok or error). */
async function fire(url, okMsg) {
  try {
    await openTellieURL(url);
    return { content: [{ type: "text", text: okMsg }] };
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

/** Build a tellie:// status URL (update/flash) with %20 encoding. */
function statusURL(action, { text, source, icon, attention }) {
  let url = `tellie://${action}?text=${encodeURIComponent(text)}`;
  if (source && source.trim()) url += `&source=${encodeURIComponent(source)}`;
  if (icon && icon.trim()) url += `&icon=${encodeURIComponent(icon)}`;
  if (action === "update" && attention) url += `&attention=1`;
  return url;
}

server.registerTool(
  "update_status",
  {
    title: "Update Tellie status",
    description:
      "Set or replace a glanceable status line in the user's Mac notch via " +
      "Tellie. Use it to show what you're doing right now (a build step, a " +
      "test run, tokens/cost used, a timer, a milestone, anything). It " +
      "REPLACES the previous line from the same source and never steals " +
      "focus or interrupts the user. Set attention=true when you need the " +
      "user to look up (you finished, or you're blocked waiting on them).",
    inputSchema: {
      text: z.string().describe("The status line to show."),
      source: z
        .string()
        .optional()
        .describe("Short name for who this is (e.g. 'Claude', 'CI', 'agent-3'), shown beside the notch."),
      icon: z
        .string()
        .optional()
        .describe("An SF Symbol name (e.g. 'hammer', 'checkmark.circle', 'bolt', 'clock') or a single emoji."),
      attention: z
        .boolean()
        .optional()
        .describe("true to draw the user's attention (a 'look up / needs you' cue)."),
    },
  },
  async ({ text, source, icon, attention }) => {
    if (!text || !text.trim()) {
      return { isError: true, content: [{ type: "text", text: "No status text provided." }] };
    }
    return fire(
      statusURL("update", { text, source, icon, attention }),
      `Notch status set: "${text}"${source ? ` (${source})` : ""}.`
    );
  }
);

server.registerTool(
  "flash_status",
  {
    title: "Flash a Tellie status",
    description:
      "Show a brief status in the user's notch that auto-clears after a few " +
      "seconds. Use for one-off pings / milestones (e.g. 'PR opened', " +
      "'deploy finished'). Like update_status but transient.",
    inputSchema: {
      text: z.string().describe("The status to flash."),
      source: z.string().optional().describe("Short name for who this is."),
      icon: z.string().optional().describe("An SF Symbol name or a single emoji."),
    },
  },
  async ({ text, source, icon }) => {
    if (!text || !text.trim()) {
      return { isError: true, content: [{ type: "text", text: "No status text provided." }] };
    }
    return fire(
      statusURL("flash", { text, source, icon }),
      `Flashed: "${text}".`
    );
  }
);

server.registerTool(
  "clear_notch",
  {
    title: "Clear the Tellie notch",
    description: "Remove whatever Tellie is currently showing, back to the bare notch.",
    inputSchema: {},
  },
  async () => fire("tellie://clear", "Notch cleared.")
);

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
