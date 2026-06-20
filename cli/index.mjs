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
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import os from "node:os";
import path from "node:path";

const HELP = `tellie — push to Tellie's notch (the silent second screen)

USAGE
  tellie update <text> [--source NAME] [--icon SYMBOL] [--attention] [--link URL] [--app BUNDLE_ID]
  tellie flash  <text> [--source NAME] [--icon SYMBOL] [--link URL] [--app BUNDLE_ID]
  tellie send   <text> [--source NAME]
  tellie send   --file PATH [--source NAME]
  tellie clear
  tellie setup  claude-code [--off]
  tellie status [--json]
  tellie log    [--source NAME] [--since 1h] [--day YYYY-MM-DD] [--limit N] [--json]
  tellie --help

  update  set/replace a glanceable status line (stays until changed)
  flash   a transient status that auto-clears after a few seconds
  send    load readable content as a teleprompter script (click to read)
  clear   remove whatever is showing
  setup   wire Tellie into your tools. "setup claude-code" taps your notch
          when Claude Code finishes or needs you, hands-free. Free.
  status  read the LIVE notch state (the current roster). Free.
  log     read the notch history (Tellie Pro records it). Pro.

EXAMPLES
  tellie update "Building project…" --source Claude --icon hammer
  tellie update "Needs your review" --source Claude --icon checkmark.circle --attention
  tellie flash  "PR #149 opened" --source CI --icon bolt
  tellie update "42k tokens · \\$0.11" --source agent-3 --icon 🤖
  tellie update "CI #1234 passed" --source CI --icon hammer --link https://github.com/owner/repo/actions
  tellie send "You're on in 5 minutes" --source Calendar
  echo "piped text" | tellie update --source pipe
  tellie clear

  tellie status --json | jq '.roster[].source'
  tellie log --source CI --since 6h
  tellie log --json | jq '.[] | select(.attention)'

NOTES
  --icon is an SF Symbol name (hammer, checkmark.circle, bolt, clock) or a
  single emoji. --link makes the row clickable (opens the URL); --app opens
  an app by bundle id instead. Encoding is handled for you; you do not need
  to percent-encode.

  status/log READ Tellie's local files (no API needed): the live snapshot
  ~/Library/Application Support/Tellie/state.json (always written, free) and
  the daily history ~/Library/Application Support/Tellie/PulseLog/*.jsonl
  (written only when Tellie Pro is active). Other commands require Tellie
  installed and running.`;

const TELLIE_DIR = path.join(os.homedir(), "Library", "Application Support", "Tellie");
const STATE_PATH = path.join(TELLIE_DIR, "state.json");
const LOG_DIR = path.join(TELLIE_DIR, "PulseLog");

function dayKey(date) {
  const p = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

// Parse "30m" / "2h" / "1d" / "90s" -> seconds. Default 24h.
function parseSince(s) {
  if (!s) return 24 * 3600;
  const m = String(s).trim().match(/^(\d+(?:\.\d+)?)([smhd])?$/);
  if (!m) return 24 * 3600;
  const n = parseFloat(m[1]);
  const unit = m[2] || "h";
  return n * { s: 1, m: 60, h: 3600, d: 86400 }[unit];
}

function clockTime(ts) {
  return new Date(ts * 1000).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function readLogEntries({ source, sinceSec, day, limit }) {
  const now = Date.now() / 1000;
  const cutoff = now - sinceSec;
  let dayKeys;
  if (day) {
    dayKeys = [day];
  } else {
    const days = Math.min(31, Math.ceil(sinceSec / 86400) + 1);
    dayKeys = [];
    for (let i = 0; i < days; i++) {
      dayKeys.push(dayKey(new Date(Date.now() - i * 86400 * 1000)));
    }
  }
  let out = [];
  for (const k of dayKeys) {
    const file = path.join(LOG_DIR, `${k}.jsonl`);
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

const SELF = fileURLToPath(import.meta.url);

// The command we register in Claude Code's settings.json. A direct node exec is
// fastest and survives package updates for global/local installs; when we are
// running from npx's ephemeral cache, fall back to a stable `npx` invocation.
function hookCommand(event) {
  if (SELF.includes("/_npx/")) return `npx -y @tellie/cli claude-hook ${event}`;
  return `"${process.execPath}" "${SELF}" claude-hook ${event}`;
}

function claudeSettingsPath(values) {
  if (values.settings && values.settings.trim()) return path.resolve(values.settings.trim());
  return path.join(os.homedir(), ".claude", "settings.json");
}

// Has this event array already got a hook that calls our claude-hook command?
function groupHasOurHook(arr, event) {
  return arr.some((g) => (g.hooks || []).some(
    (h) => typeof h.command === "string" && h.command.includes(`claude-hook ${event}`)));
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
        json: { type: "boolean" },
        since: { type: "string" },
        day: { type: "string" },
        limit: { type: "string" },
        off: { type: "boolean" },
        settings: { type: "string" },
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

  if (cmd === "status") {
    if (!existsSync(STATE_PATH)) {
      fail("no live state found. Is Tellie running? (looked for state.json)");
    }
    let state;
    try { state = JSON.parse(readFileSync(STATE_PATH, "utf8")); }
    catch { fail("couldn't parse state.json."); }
    if (values.json) {
      process.stdout.write(JSON.stringify(state, null, 2) + "\n");
      return;
    }
    const roster = state.roster || [];
    if (roster.length === 0) {
      process.stdout.write("Notch is empty.\n");
    } else {
      for (const r of roster) {
        const arrow = r.link || r.app ? "  ↗" : "";
        const src = r.source ? `${r.source}: ` : "";
        process.stdout.write(`${src}${r.text}${arrow}\n`);
      }
    }
    if (state.parkedSend) {
      process.stdout.write(`\n(parked send from ${state.parkedSend.source}: ${state.parkedSend.preview})\n`);
    }
    return;
  }

  if (cmd === "log") {
    const limit = values.limit ? parseInt(values.limit, 10) || 0 : 20;
    const entries = readLogEntries({
      source: values.source && values.source.trim() ? values.source.trim() : null,
      sinceSec: parseSince(values.since),
      day: values.day && values.day.trim() ? values.day.trim() : null,
      limit,
    });
    if (values.json) {
      process.stdout.write(JSON.stringify(entries, null, 2) + "\n");
      return;
    }
    if (entries.length === 0) {
      process.stdout.write("No history. (Tellie Pro records the notch history; nothing matched.)\n");
      return;
    }
    for (const e of entries) {
      const arrow = e.link || e.app ? "  ↗" : "";
      const src = e.source ? `${e.source}: ` : "";
      process.stdout.write(`${clockTime(e.ts)}   ${src}${e.text}${arrow}\n`);
    }
    return;
  }

  if (cmd === "setup") {
    const target = (positionals[1] || "").toLowerCase();
    if (target !== "claude-code" && target !== "claude") {
      fail('setup: only "claude-code" is supported right now. Try: tellie setup claude-code');
    }
    const sp = claudeSettingsPath(values);

    // Load existing settings safely. A missing file is fine (start fresh); an
    // unparseable file is NOT (we refuse rather than clobber the user's config).
    let settings = {};
    if (existsSync(sp)) {
      try { settings = JSON.parse(readFileSync(sp, "utf8")); }
      catch { fail(`${sp} is not valid JSON. Fix it first so I don't overwrite your settings.`); }
      if (settings === null || typeof settings !== "object") settings = {};
    }
    if (!settings.hooks || typeof settings.hooks !== "object") settings.hooks = {};

    if (values.off) {
      // Remove only the groups we added (identified by our claude-hook command).
      for (const event of ["Stop", "Notification"]) {
        if (Array.isArray(settings.hooks[event])) {
          settings.hooks[event] = settings.hooks[event].filter(
            (g) => !(g.hooks || []).some((h) => typeof h.command === "string" && h.command.includes("claude-hook")));
          if (settings.hooks[event].length === 0) delete settings.hooks[event];
        }
      }
      if (Object.keys(settings.hooks).length === 0) delete settings.hooks;
      if (existsSync(sp)) copyFileSync(sp, sp + ".tellie-bak");
      writeFileSync(sp, JSON.stringify(settings, null, 2) + "\n");
      process.stdout.write("Done. Tellie has stopped watching Claude Code.\n");
      return;
    }

    // Install: add our Stop + Notification hooks if not already present.
    for (const [event, ev] of [["Stop", "stop"], ["Notification", "notification"]]) {
      if (!Array.isArray(settings.hooks[event])) settings.hooks[event] = [];
      if (!groupHasOurHook(settings.hooks[event], ev)) {
        settings.hooks[event].push({ matcher: "", hooks: [{ type: "command", command: hookCommand(ev) }] });
      }
    }
    mkdirSync(path.dirname(sp), { recursive: true });
    if (existsSync(sp)) copyFileSync(sp, sp + ".tellie-bak");
    writeFileSync(sp, JSON.stringify(settings, null, 2) + "\n");

    process.stdout.write(
      "\nTellie is now watching Claude Code.\n\n" +
      "Start a task and walk away. I'll tap your notch the moment Claude\n" +
      "finishes, or the moment it needs you. No dashboard, no babysitting\n" +
      "the terminal.\n\n" +
      "Restart Claude Code (or open a new session) for it to take effect.\n" +
      "Undo anytime: tellie setup claude-code --off\n");
    return;
  }

  if (cmd === "claude-hook") {
    // Internal: invoked by Claude Code's hooks. Reads the hook JSON on stdin,
    // pushes a glance to the notch, and ALWAYS exits 0 (never blocks Claude).
    let payload = {};
    try {
      const raw = readFileSync(0, "utf8");
      if (raw.trim()) payload = JSON.parse(raw);
    } catch { /* ignore */ }
    const event = (positionals[1] || "").toLowerCase();
    try {
      if (event === "stop") {
        if (!payload.stop_hook_active) {
          const proj = payload.cwd ? path.basename(String(payload.cwd)) : "";
          const text = proj ? `Claude finished · ${proj}` : "Claude finished";
          await openTellie(`tellie://flash?text=${encodeURIComponent(text)}&source=${encodeURIComponent("Claude Code")}&icon=checkmark.circle`);
        }
      } else if (event === "notification") {
        // Surface the "needs you" notifications; skip pure noise like auth_success.
        if (String(payload.notification_type || "") !== "auth_success") {
          const text = (payload.message && String(payload.message).trim()) || "Claude needs you";
          await openTellie(`tellie://update?text=${encodeURIComponent(text)}&source=${encodeURIComponent("Claude Code")}&icon=bell.badge&attention=1`);
        }
      }
    } catch { /* never fail a hook */ }
    process.exit(0);
  }

  fail(`unknown command "${cmd}". See --help.`);
}

main().catch((e) => fail(String(e.message || e)));
