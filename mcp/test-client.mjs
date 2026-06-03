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
console.log("SCHEMA:", JSON.stringify(tools[0]?.inputSchema));

const res = await client.callTool({
  name: "send_to_tellie",
  arguments: {
    text: "Hello from the Tellie MCP spike. If you can read this in the notch, the round trip works.",
    source: "MCP test",
  },
});
console.log("CALL RESULT:", JSON.stringify(res));

await client.close();
console.log("OK");
