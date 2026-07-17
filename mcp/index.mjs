#!/usr/bin/env node
// Tellie MCP server.
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
import { readFileSync, existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const server = new McpServer({ name: "tellie", version: "0.0.1" });

// Tellie writes two local files an agent can READ (no API needed): a live
// snapshot (state.json, always written, free) and the daily history
// (PulseLog/*.jsonl, written only under Tellie Pro). Steve 2026-06-03.
const TELLIE_DIR = path.join(os.homedir(), "Library", "Application Support", "Tellie");
const STATE_PATH = path.join(TELLIE_DIR, "state.json");
const LOG_DIR = path.join(TELLIE_DIR, "PulseLog");

function dayKey(date) {
  const p = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

function readState() {
  if (!existsSync(STATE_PATH)) return null;
  try { return JSON.parse(readFileSync(STATE_PATH, "utf8")); } catch { return null; }
}

function readLogEntries({ source, sinceHours, limit }) {
  const sinceSec = (sinceHours || 24) * 3600;
  const cutoff = Date.now() / 1000 - sinceSec;
  const days = Math.min(31, Math.ceil(sinceSec / 86400) + 1);
  let out = [];
  for (let i = 0; i < days; i++) {
    const file = path.join(LOG_DIR, `${dayKey(new Date(Date.now() - i * 86400 * 1000))}.jsonl`);
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      if (!line.trim()) continue;
      let e;
      try { e = JSON.parse(line); } catch { continue; }
      if (typeof e.ts !== "number" || e.ts < cutoff) continue;
      if (source && e.source !== source) continue;
      out.push(e);
    }
  }
  out.sort((a, b) => b.ts - a.ts);
  if (limit > 0) out = out.slice(0, limit);
  return out;
}

/** Open a tellie:// URL via macOS `open` (background), resolving when it returns. */
function openTellieURL(url) {
  return new Promise((resolve, reject) => {
    // `-g` keeps Tellie in the background. Without it, `open` activates Tellie
    // and steals keyboard focus from the user's foreground app (stray
    // keystrokes then beep). Tellie writes are ambient by design. Steve
    // 2026-06-03.
    execFile("open", ["-g", url], (err) => (err ? reject(err) : resolve()));
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
function statusURL(action, { text, source, icon, attention, link, app }) {
  let url = `tellie://${action}?text=${encodeURIComponent(text)}`;
  if (source && source.trim()) url += `&source=${encodeURIComponent(source)}`;
  if (icon && icon.trim()) url += `&icon=${encodeURIComponent(icon)}`;
  if (action === "update" && attention) url += `&attention=1`;
  if (link && link.trim()) url += `&link=${encodeURIComponent(link)}`;
  if (app && app.trim()) url += `&app=${encodeURIComponent(app)}`;
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
      link: z
        .string()
        .optional()
        .describe("A URL to open if the user clicks this row in the notch (e.g. a CI run, a PR)."),
      app: z
        .string()
        .optional()
        .describe("An app bundle id to open on click (e.g. 'com.apple.Safari'); used only if link is absent."),
    },
  },
  async ({ text, source, icon, attention, link, app }) => {
    if (!text || !text.trim()) {
      return { isError: true, content: [{ type: "text", text: "No status text provided." }] };
    }
    return fire(
      statusURL("update", { text, source, icon, attention, link, app }),
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
      link: z.string().optional().describe("A URL to open if the user clicks this row."),
      app: z.string().optional().describe("An app bundle id to open on click; used only if link is absent."),
    },
  },
  async ({ text, source, icon, link, app }) => {
    if (!text || !text.trim()) {
      return { isError: true, content: [{ type: "text", text: "No status text provided." }] };
    }
    return fire(
      statusURL("flash", { text, source, icon, link, app }),
      `Flashed: "${text}".`
    );
  }
);

server.registerTool(
  "clear_notch",
  {
    title: "Clear the Tellie notch",
    description:
      "Remove status from the notch. With `source`, removes just that " +
      "source's line from the multi-source roster (use this to sign off " +
      "when you're done). Without `source`, clears everything.",
    inputSchema: {
      source: z
        .string()
        .optional()
        .describe("Remove only this source's status line. Omit to clear all."),
    },
  },
  async ({ source }) => {
    const url = source && source.trim()
      ? `tellie://clear?source=${encodeURIComponent(source)}`
      : "tellie://clear";
    return fire(url, source ? `Cleared ${source} from the notch.` : "Notch cleared.");
  }
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

server.registerTool(
  "read_notch",
  {
    title: "Read the Tellie notch (live)",
    description:
      "Read what's currently on the user's notch: the live status roster " +
      "(each source's current line) and any parked send. Lets you check " +
      "whether another agent is already reporting, avoid duplicate work, or " +
      "react to the current state. Reads a local snapshot file; no effect on " +
      "the notch. Always available (free).",
    inputSchema: {},
  },
  async () => {
    const state = readState();
    if (!state) {
      return { content: [{ type: "text", text: "Notch state unavailable (is Tellie running?)." }] };
    }
    return { content: [{ type: "text", text: JSON.stringify(state, null, 2) }] };
  }
);

server.registerTool(
  "read_log",
  {
    title: "Read the Tellie notch history",
    description:
      "Read recent notch history (everything pushed via update/flash/send/the " +
      "hotkey), newest first. Use to recall what happened, summarize a " +
      "session, or build a report. Reads local daily files that Tellie Pro " +
      "records; returns empty if Pro isn't recording.",
    inputSchema: {
      source: z.string().optional().describe("Only entries from this source name."),
      sinceHours: z.number().optional().describe("How far back to look, in hours (default 24)."),
      limit: z.number().optional().describe("Max entries to return (default 50)."),
    },
  },
  async ({ source, sinceHours, limit }) => {
    const entries = readLogEntries({
      source: source && source.trim() ? source.trim() : null,
      sinceHours: sinceHours || 24,
      limit: limit && limit > 0 ? limit : 50,
    });
    return { content: [{ type: "text", text: JSON.stringify(entries, null, 2) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
