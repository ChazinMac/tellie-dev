#!/usr/bin/env node
// tellie — command-line tool for Tellie's silent second screen (the Mac
// notch). Thin wrapper over the public `tellie://` URL scheme, so it works
// against any installed Tellie build and needs no private API. It builds
// the URL (encoding handled for you) and `open`s it. Steve 2026-06-02.
//
// Commands (today): send, dismiss. update/flash land once the Mac app
// ships those URL actions (see TELLIE-FOR-DEVS-SPEC.md).

import { execFile, execFileSync } from "node:child_process";
import { parseArgs } from "node:util";
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, unlinkSync, readdirSync, statSync, appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import os from "node:os";
import path from "node:path";

const HELP = `tellie — push to Tellie's notch (the silent second screen)

USAGE
  tellie update <text> [--source NAME] [--icon SYMBOL] [--attention] [--link URL] [--app BUNDLE_ID] [--feed PATH]
  tellie flash  <text> [--source NAME] [--icon SYMBOL] [--link URL] [--app BUNDLE_ID] [--feed PATH]
  tellie send   <text> [--source NAME]
  tellie send   --file PATH [--source NAME]
  tellie clear
  tellie setup  claude-code [--feed PATH] [--off]
  tellie setup  lmstudio [--off]
  tellie status [--json]
  tellie log    [--source NAME] [--since 1h] [--day YYYY-MM-DD] [--limit N] [--json]
  tellie --help

  update  set/replace a glanceable status line (stays until changed)
  flash   a transient status that auto-clears after a few seconds
  send    load readable content as a teleprompter script (click to read)
  clear   remove whatever is showing
  setup   wire Tellie into your tools, hands-free. "setup claude-code" taps
          your notch when Claude Code finishes or needs you (add --feed PATH to
          share one feed across Macs or a team). "setup lmstudio" registers
          Tellie as an MCP server so a local tool-calling model can push to the
          notch. Undo either with --off. Free.
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

  --feed PATH appends the pulse to a shared feed file (JSONL) instead of your
  own notch; anyone whose Tellie watches that file gets it. Use --feed default
  to target the local file Tellie watches by default (Application Support/
  Tellie/feed.jsonl). Point it at a Dropbox/Drive/iCloud file to share across
  your Macs or with a team. No server.

  --origin NAME tags WHERE a feed pulse came from (a machine or a person). It
  shows right-justified in the notch — e.g. source "Claude" on the left, origin
  "Steve's MacBook Pro" or "Dana" on the right — so a fleet of agents across
  machines (or a team) stays distinct. Origin only appears for feed entries that
  set it; a plain local pulse looks the same as always.

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
function hookCommand(event, feedPath) {
  // Only bake --feed for a custom (team) file; the default path is resolved at
  // hook time, so the common solo case needs nothing embedded.
  const feedArg = feedPath ? ` --feed ${JSON.stringify(feedPath)}` : "";
  if (SELF.includes("/_npx/")) return `npx -y @tellie/cli claude-hook ${event}${feedArg}`;
  return `"${process.execPath}" "${SELF}" claude-hook ${event}${feedArg}`;
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

// "Finished" only taps the notch when a turn ran at least this long, so quick
// back-and-forth stays quiet and you only hear about work you walked away from.
// (Generous on purpose: Claude will only get faster.)
const FINISH_THRESHOLD_SEC = 45;
const TIMER_DIR = path.join(os.tmpdir(), "tellie-claude");

function timerFile(sessionId) {
  const safe = String(sessionId || "default").replace(/[^A-Za-z0-9_.-]/g, "_");
  return path.join(TIMER_DIR, safe + ".start");
}
function recordTurnStart(sessionId) {
  try {
    mkdirSync(TIMER_DIR, { recursive: true });
    // best-effort prune of stale markers (sessions that started but never stopped)
    try {
      for (const f of readdirSync(TIMER_DIR)) {
        const full = path.join(TIMER_DIR, f);
        if (Date.now() - statSync(full).mtimeMs > 86400000) unlinkSync(full);
      }
    } catch { /* ignore */ }
    writeFileSync(timerFile(sessionId), String(Date.now()));
  } catch { /* ignore */ }
}
// Seconds since this turn started, consuming the marker. null if unknown.
function turnElapsedSec(sessionId) {
  try {
    const f = timerFile(sessionId);
    if (!existsSync(f)) return null;
    const started = parseInt(readFileSync(f, "utf8").trim(), 10);
    try { unlinkSync(f); } catch { /* ignore */ }
    return Number.isFinite(started) ? (Date.now() - started) / 1000 : null;
  } catch { return null; }
}
function formatDuration(sec) {
  const s = Math.round(sec);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60), r = s % 60;
  return r ? `${m}m ${r}s` : `${m}m`;
}

// A short, human-friendly name for THIS machine, used to label its agents in the
// shared feed (e.g. "Claude · Steve's MacBook Air"). So a solo dev's fleet —
// several agents and/or several Macs — shows up as distinct roster rows, and a
// teammate's machine is distinguishable too. Computed once per run.
let _machineName;
function machineName() {
  if (_machineName !== undefined) return _machineName;
  try {
    const n = execFileSync("scutil", ["--get", "ComputerName"], { encoding: "utf8", timeout: 1500 }).trim();
    if (n) return (_machineName = n);
  } catch { /* fall through to hostname */ }
  return (_machineName = os.hostname().replace(/\.(local|lan)$/i, ""));
}

// The agent name for Claude Code (the LEFT label in the notch). One const so
// adding other agents (OpenClaw, etc.) later is a one-line change. The machine
// name rides separately as `origin` (the RIGHT label), so the notch shows
// "Claude … <text> … Steve's MacBook Pro" and the origin only appears for feed
// entries — a plain local pulse stays clean.
const HOOK_AGENT = "Claude";

// Append one JSON record as a line to a feed file. Flag "a" is O_APPEND, so the
// OS places each small line at end-of-file atomically: multiple agents on THIS
// machine writing at the same instant never clobber each other. Across machines
// the sync service (iCloud/Dropbox) is last-writer-wins — rare, and degrades to
// a recoverable conflict copy, not silent loss.
function feedAppend(feedPath, rec) {
  mkdirSync(path.dirname(feedPath), { recursive: true });
  appendFileSync(feedPath, JSON.stringify(rec) + "\n");
}

// Which feed file to write: an explicit --feed PATH, the literal "default", or
// (unset) the zero-config file the Mac app already watches.
function resolveFeed(values) {
  const v = (values.feed || "").trim();
  return (!v || v === "default") ? defaultFeedPath() : path.resolve(v);
}

// The default feed file the Mac app watches. The app publishes the file it is
// CURRENTLY watching (Local or Team) to active-feed.txt, so `--feed default`
// follows the app's Local/Team toggle with no reconfig: flip Tellie to Team and
// your pulses land in the shared feed automatically. Falls back to the local
// file (matching PrompterState.defaultFeedURL) when the pointer is absent. A
// LOCAL default, never iCloud, so a plain teleprompter user never sees the
// "access iCloud Drive" prompt.
function defaultFeedPath() {
  const base = path.join(os.homedir(), "Library", "Application Support", "Tellie");
  try {
    const active = readFileSync(path.join(base, "active-feed.txt"), "utf8").trim();
    if (active) return active;
  } catch {}
  return path.join(base, "feed.jsonl");
}

// Be forgiving if --link was already percent-encoded: a real URL never starts
// with a literal "https%3A", so if it does, the caller pre-encoded it. Decode
// once so we don't double-encode into a broken "https%3A..." link that Finder
// refuses to open (error -50). Steve hit this 2026-06-21.
function normalizeLink(v) {
  let s = (v || "").trim();
  if (s && /^https?%3a/i.test(s)) {
    try { s = decodeURIComponent(s); } catch {}
  }
  return s;
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
        feed: { type: "string" },
        origin: { type: "string" },
        "origin-icon": { type: "string" },
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
    const link = normalizeLink(values.link);   // raw URL in; never double-encoded
    // --feed: append a JSON line to a shared feed file instead of opening the
    // local notch. A teammate, CI job, agent, or iPhone Shortcut writes here;
    // anyone whose Tellie watches the file gets the pulse. ts is unix SECONDS
    // to match the app's feed dedup. Steve 2026-06-20.
    if (values.feed && values.feed.trim()) {
      const rec = { ts: Date.now() / 1000, kind: cmd, text };
      if (values.source && values.source.trim()) rec.source = values.source.trim();
      if (values.origin && values.origin.trim()) rec.origin = values.origin.trim();
      if (values["origin-icon"] && values["origin-icon"].trim()) rec.originIcon = values["origin-icon"].trim();
      if (values.icon && values.icon.trim()) rec.icon = values.icon.trim();
      if (link) rec.link = link;
      if (cmd === "update" && values.attention) rec.attention = true;
      feedAppend(resolveFeed(values), rec);
      return;
    }
    let url = `tellie://${cmd}?text=${encodeURIComponent(text)}`;
    if (values.source && values.source.trim()) url += `&source=${encodeURIComponent(values.source)}`;
    if (values.icon && values.icon.trim()) url += `&icon=${encodeURIComponent(values.icon)}`;
    if (cmd === "update" && values.attention) url += `&attention=1`;
    if (link) url += `&link=${encodeURIComponent(link)}`;
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

    // --- LM Studio (and any MCP client): register the Tellie MCP server so a
    // local tool-calling model can push to the notch. LM Studio reads
    // ~/.lmstudio/mcp.json; we merge in (or remove) just our "tellie" entry,
    // leaving any other servers untouched. Backup before writing, same as
    // the claude-code path.
    if (target === "lmstudio" || target === "lm-studio") {
      const mp = path.join(os.homedir(), ".lmstudio", "mcp.json");
      let conf = { mcpServers: {} };
      if (existsSync(mp)) {
        try { conf = JSON.parse(readFileSync(mp, "utf8")); }
        catch { fail(`${mp} is not valid JSON. Fix it first so I don't overwrite your config.`); }
        if (conf === null || typeof conf !== "object") conf = {};
      }
      if (!conf.mcpServers || typeof conf.mcpServers !== "object") conf.mcpServers = {};

      mkdirSync(path.dirname(mp), { recursive: true });
      if (values.off) {
        delete conf.mcpServers.tellie;
        if (existsSync(mp)) copyFileSync(mp, mp + ".tellie-bak");
        writeFileSync(mp, JSON.stringify(conf, null, 2) + "\n");
        process.stdout.write("Done. Removed Tellie from LM Studio's MCP servers.\n");
        return;
      }

      // GUI apps (LM Studio) launch with a minimal PATH that doesn't include
      // nvm/Homebrew node, so a bare "npx" fails to spawn and the server
      // silently never appears in Integrations. Resolve the absolute npx that
      // sits beside the node running this CLI, and fall back to bare "npx" only
      // if we can't find it.
      const npxAbs = path.join(path.dirname(process.execPath), "npx");
      const npxCmd = existsSync(npxAbs) ? npxAbs : "npx";
      conf.mcpServers.tellie = { command: npxCmd, args: ["-y", "@tellie/mcp"] };
      if (existsSync(mp)) copyFileSync(mp, mp + ".tellie-bak");
      writeFileSync(mp, JSON.stringify(conf, null, 2) + "\n");
      process.stdout.write(
        "\nTellie is now an MCP server in LM Studio.\n\n" +
        "1. Fully quit and reopen LM Studio so it re-reads the config.\n" +
        "2. Load a tool-calling chat model on THIS Mac (Qwen or Llama-3.x-\n" +
        "   instruct are solid; embedding-only or tiny models won't call tools).\n" +
        "3. In the chat, click the wrench icon in the message bar and switch on\n" +
        "   mcp/tellie for the conversation.\n" +
        "4. Ask it to \"call the update_status tool\" and approve the tool call.\n" +
        "   The strip drops into your notch.\n\n" +
        "Three tools are exposed: update_status, flash_status, send_to_tellie.\n" +
        "Undo anytime: tellie setup lmstudio --off\n");
      return;
    }

    if (target !== "claude-code" && target !== "claude") {
      fail('setup: supported targets are "claude-code" and "lmstudio". Try: tellie setup lmstudio');
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
      for (const event of ["UserPromptSubmit", "Stop", "Notification"]) {
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

    // A custom --feed targets a shared team file (e.g. a Dropbox path); unset
    // means the zero-config feed the app already watches (resolved at hook time).
    const teamFeed = (values.feed && values.feed.trim() && values.feed.trim() !== "default")
      ? path.resolve(values.feed.trim()) : null;

    // Install: add our Stop + Notification hooks if not already present.
    for (const [event, ev] of [["UserPromptSubmit", "prompt"], ["Stop", "stop"], ["Notification", "notification"]]) {
      if (!Array.isArray(settings.hooks[event])) settings.hooks[event] = [];
      if (!groupHasOurHook(settings.hooks[event], ev)) {
        settings.hooks[event].push({ matcher: "", hooks: [{ type: "command", command: hookCommand(ev, teamFeed) }] });
      }
    }
    mkdirSync(path.dirname(sp), { recursive: true });
    if (existsSync(sp)) copyFileSync(sp, sp + ".tellie-bak");
    writeFileSync(sp, JSON.stringify(settings, null, 2) + "\n");

    process.stdout.write(
      "\nTellie is now watching Claude Code.\n\n" +
      "Start a task and walk away. I'll tap your notch the moment Claude\n" +
      "needs you, and when it finishes something you waited on. Quick replies\n" +
      "stay quiet (I only flag a finish if the task ran 45 seconds or more), so\n" +
      "it's signal, not noise. No dashboard, no babysitting the terminal.\n\n" +
      (teamFeed
        ? `Posting to your shared feed:\n  ${teamFeed}\n` +
          "Everyone whose Tellie watches that file sees this machine's agents.\n\n"
        : "Runs on more than one Mac, or a team? Point each machine at the same\n" +
          "shared-folder file: re-run with --feed <shared-folder-file> (e.g. a\n" +
          "Dropbox path). Then every agent shows up in one notch.\n\n") +
      "Restart Claude Code (or open a new session) for it to take effect.\n" +
      "Undo anytime: tellie setup claude-code --off\n");
    return;
  }

  if (cmd === "claude-hook") {
    // Internal: invoked by Claude Code's hooks. Reads the hook JSON on stdin and,
    // by default, POSTS to the shared feed Tellie watches (source "Claude · <this
    // machine>"). So this machine's agents surface in your notch within a moment,
    // and — since the feed syncs — on your other Macs and teammates' notches too.
    // Always exits 0 (never blocks Claude). TELLIE_HOOK_DEBUG=1 dry-runs: print
    // the decision to stderr, write nothing.
    let payload = {};
    try {
      const raw = readFileSync(0, "utf8");
      if (raw.trim()) payload = JSON.parse(raw);
    } catch { /* ignore */ }
    const event = (positionals[1] || "").toLowerCase();
    const dry = !!process.env.TELLIE_HOOK_DEBUG;
    const feedPath = resolveFeed(values);
    const source = HOOK_AGENT;                          // LEFT label: "Claude"
    const origin = (values.origin && values.origin.trim()) || machineName(); // RIGHT label
    // Laptop by default (your fleet is machines); a teammate can pass a person
    // symbol via --origin-icon (e.g. person.fill) for the shared-feed case.
    const originIcon = (values["origin-icon"] && values["origin-icon"].trim()) || "laptopcomputer";
    // Append a finished / needs-you line to the feed. The local watcher shows it
    // promptly and the sync fans it out to the rest of your fleet.
    const post = (rec, dbg) => {
      const base = { source, origin, originIcon };
      if (dry) { process.stderr.write(`tellie-hook: ${dbg} -> ${JSON.stringify({ ...base, ...rec })}\n`); return; }
      feedAppend(feedPath, { ts: Date.now() / 1000, ...base, ...rec });
    };
    try {
      if (event === "prompt") {
        // Turn start. Stamp the time so Stop can tell long tasks from quick replies,
        // and retire this machine's prior Claude notice, since you're back typing.
        // The clear is LOCAL-only (clears don't belong in the shared feed).
        recordTurnStart(payload.session_id);
        const clearURL = `tellie://clear?source=${encodeURIComponent(source)}&origin=${encodeURIComponent(origin)}`;
        if (dry) process.stderr.write(`tellie-hook: prompt recorded + would clear "${source} · ${origin}"\n`);
        else await openTellie(clearURL);
      } else if (event === "stop") {
        if (!payload.stop_hook_active) {
          const el = turnElapsedSec(payload.session_id);
          // Only surface when the turn ran long enough that you probably stepped
          // away. el === null means we couldn't measure it, so notify, don't miss.
          if (el === null || el >= FINISH_THRESHOLD_SEC) {
            const proj = payload.cwd ? path.basename(String(payload.cwd)) : "";
            let text = proj ? `Claude finished · ${proj}` : "Claude finished";
            if (el !== null) text += ` (${formatDuration(el)})`;
            // update (not flash) so it PERSISTS until you see it. No attention:
            // a routine finish shouldn't raise the "come look now" flag (that's
            // what the Notification hook is for). Tapping the row foregrounds
            // Claude Desktop via its claude:// scheme. We use link= (not app=):
            // the feed watcher carries `link` but not `app`, and the scheme just
            // focuses the app, whereas opening the .app bundle would trip the
            // macOS App Management prompt. Steve verified 2026-07-01.
            post({ kind: "update", text, icon: "checkmark.circle", link: "claude://" },
                 `stop fire elapsed=${el === null ? "unknown" : Math.round(el) + "s"}`);
          } else if (dry) {
            process.stderr.write(`tellie-hook: stop skip elapsed=${Math.round(el)}s (< ${FINISH_THRESHOLD_SEC}s)\n`);
          }
        } else if (dry) {
          process.stderr.write("tellie-hook: stop skip (stop_hook_active)\n");
        }
      } else if (event === "notification") {
        // Surface the "needs you" notifications; skip pure noise like auth_success.
        if (String(payload.notification_type || "") !== "auth_success") {
          const text = (payload.message && String(payload.message).trim()) || "Claude needs you";
          post({ kind: "update", text, icon: "bell.badge", attention: true, link: "claude://" }, "notification fire");
        } else if (dry) {
          process.stderr.write("tellie-hook: notification skip (auth_success)\n");
        }
      }
    } catch { /* never fail a hook */ }
    process.exit(0);
  }

  fail(`unknown command "${cmd}". See --help.`);
}

main().catch((e) => fail(String(e.message || e)));
