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

const HELP = `tellie — push to Tellie's notch (the silent second screen)

USAGE
  tellie update <text> [--source NAME] [--icon SYMBOL] [--attention] [--link URL] [--app BUNDLE_ID]
  tellie flash  <text> [--source NAME] [--icon SYMBOL] [--link URL] [--app BUNDLE_ID]
  tellie send   <text> [--source NAME]
  tellie send   --file PATH [--source NAME]
  tellie clear
  tellie --help

  update  set/replace a glanceable status line (stays until changed)
  flash   a transient status that auto-clears after a few seconds
  send    load readable content as a teleprompter script (click to read)
  clear   remove whatever is showing

EXAMPLES
  tellie update "Building project…" --source Claude --icon hammer
  tellie update "Needs your review" --source Claude --icon checkmark.circle --attention
  tellie flash  "PR #149 opened" --source CI --icon bolt
  tellie update "42k tokens · \\$0.11" --source agent-3 --icon 🤖
  tellie update "CI #1234 passed" --source CI --icon hammer --link https://github.com/owner/repo/actions
  tellie send "You're on in 5 minutes" --source Calendar
  echo "piped text" | tellie update --source pipe
  tellie clear

NOTES
  --icon is an SF Symbol name (hammer, checkmark.circle, bolt, clock) or a
  single emoji. --link makes the row clickable (opens the URL); --app opens
  an app by bundle id instead. Requires Tellie installed and running on this
  Mac. Encoding is handled for you; you do not need to percent-encode.`;

function openTellie(url) {
  return new Promise((resolve, reject) => {
    // `-g` = do NOT bring Tellie to the foreground. Without it, macOS `open`
    // activates Tellie and steals keyboard focus from whatever the user is
    // typing in (and stray keystrokes then beep). Tellie writes are meant to
    // be ambient, so we always open in the background. Steve 2026-06-03.
    execFile("open", ["-g", url], (err) => (err ? reject(err) : resolve()));
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
        icon: { type: "string", short: "i" },
        attention: { type: "boolean", short: "a" },
        link: { type: "string", short: "l" },
        app: { type: "string" },
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

  // Read text from positional args or piped stdin.
  const textArg = () => {
    let t = positionals.slice(1).join(" ");
    if (!t && !process.stdin.isTTY) t = readFileSync(0, "utf8").trim();
    return t;
  };

  if (cmd === "update" || cmd === "flash") {
    const text = textArg();
    if (!text) fail(`${cmd} needs text, or piped stdin. See --help.`);
    let url = `tellie://${cmd}?text=${encodeURIComponent(text)}`;
    if (values.source && values.source.trim()) url += `&source=${encodeURIComponent(values.source)}`;
    if (values.icon && values.icon.trim()) url += `&icon=${encodeURIComponent(values.icon)}`;
    if (cmd === "update" && values.attention) url += `&attention=1`;
    if (values.link && values.link.trim()) url += `&link=${encodeURIComponent(values.link)}`;
    if (values.app && values.app.trim()) url += `&app=${encodeURIComponent(values.app)}`;
    await openTellie(url);
    return;
  }

  if (cmd === "clear" || cmd === "dismiss") {
    // clear --source NAME removes just that source from the roster;
    // bare clear wipes everything.
    let url = "tellie://clear";
    if (values.source && values.source.trim()) {
      url += `?source=${encodeURIComponent(values.source)}`;
    }
    await openTellie(url);
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
