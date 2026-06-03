#!/usr/bin/env node
// Spike test harness: launches index.mjs as an MCP server over stdio,
// lists its tools, and calls send_to_tellie once. Verifies the full MCP
// round-trip without needing Claude Desktop. The call actually fires
// `open tellie://send`, so a running Tellie should show the strip.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({ command: "node", args: ["index.mjs"] });
const client = new Client({ name: "tellie-spike-test", version: "0.0.0" });

await client.connect(transport);

const { tools } = await client.listTools();
console.log("TOOLS:", tools.map((t) => t.name).join(", "));

const call = async (name, args) => {
  const res = await client.callTool({ name, arguments: args });
  console.log(`${name}:`, JSON.stringify(res.content?.[0]?.text ?? res));
};

await call("update_status", { text: "Running tests… (MCP)", source: "Claude", icon: "hammer" });
await new Promise((r) => setTimeout(r, 1500));
await call("update_status", { text: "Needs your review (MCP)", source: "Claude", icon: "checkmark.circle", attention: true });
await new Promise((r) => setTimeout(r, 1500));
await call("flash_status", { text: "Deployed 🚀 (MCP)", source: "CI", icon: "bolt" });
await new Promise((r) => setTimeout(r, 1500));
await call("read_notch", {});
await call("read_log", { sinceHours: 1, limit: 5 });
await call("clear_notch", {});

await client.close();
console.log("OK");
