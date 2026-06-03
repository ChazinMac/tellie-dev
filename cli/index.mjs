#!/usr/bin/env node
// tellie — command-line tool for Tellie's silent second screen (the Mac
// notch). Thin wrapper over the public `tellie://` URL scheme, so it works
// against any installed Tellie build and needs no private API. It builds
// the URL (encoding handled for you) and `open`s it. Steve 2026-06-02.
//
// Commands (today): send, dismiss. update/flash land once the Mac app
// ships those URL actions (see TELLIE-FOR-DEVS-SPEC.md).

import { execFile } from "node:child_process";
import { parseArgs } from "node:util";
import { readFileSync } from "node:fs";

const HELP = `tellie — push text to Tellie's notch

USAGE
  tellie send <text> [--source NAME]
  tellie send --file PATH [--source NAME]
  tellie dismiss
  tellie --help

EXAMPLES
  tellie send "You're on in 5 minutes" --source Calendar
  tellie send --file ./script.md --source Drafts
  echo "piped text" | tellie send --source pipe
  tellie dismiss

NOTES
  Requires Tellie installed and running on this Mac. Encoding (spaces,
  punctuation) is handled for you; you do not need to percent-encode.`;

function openTellie(url) {
  return new Promise((resolve, reject) => {
    execFile("open", [url], (err) => (err ? reject(err) : resolve()));
  });
}

function fail(msg) {
  process.stderr.write(`tellie: ${msg}\n`);
  process.exit(1);
}

async function main() {
  let parsed;
  try {
    parsed = parseArgs({
      allowPositionals: true,
      options: {
        source: { type: "string", short: "s" },
        file: { type: "string", short: "f" },
        help: { type: "boolean", short: "h" },
      },
    });
  } catch (e) {
    fail(String(e.message || e));
  }
  const { values, positionals } = parsed;

  if (values.help || positionals[0] === "help" || positionals.length === 0) {
    process.stdout.write(HELP + "\n");
    return;
  }

  const cmd = positionals[0];

  if (cmd === "dismiss") {
    await openTellie("tellie://dismiss");
    return;
  }

  if (cmd === "send") {
    let url = "tellie://send?";
    if (values.file) {
      // The Mac app reads the file locally; pass the absolute path.
      url += `file=${encodeURIComponent(values.file)}`;
    } else {
      // Text from the positional arg, or piped stdin.
      let text = positionals.slice(1).join(" ");
      if (!text && !process.stdin.isTTY) {
        text = readFileSync(0, "utf8").trim(); // read stdin
      }
      if (!text) fail("send needs text, --file PATH, or piped stdin. See --help.");
      url += `text=${encodeURIComponent(text)}`;
    }
    if (values.source && values.source.trim()) {
      url += `&source=${encodeURIComponent(values.source)}`;
    }
    await openTellie(url);
    return;
  }

  fail(`unknown command "${cmd}". See --help.`);
}

main().catch((e) => fail(String(e.message || e)));
