# Tellie for Developers — spec

Working spec for the `tellie-dev` repo (MCP server + CLI). Building toward
the Tellie 1.4 launch (target July 8, 2026) with a hard **July 1 go/no-go**
(else fast-follow). Update this as decisions firm up.

Status: **drafted 2026-06-02.** MCP spike PASSED (one tool, `send_to_tellie`,
over `tellie://send`).

---

## The thesis: a primitive, not a feature

Tellie for Developers is **a glanceable surface in your notch that you can
push anything to** from a terminal, a script, an AI agent, or any MCP-aware
client. It does not steal focus or take over your screen (the silent
second screen identity); you glance at it on your schedule.

We ship a small set of **general verbs** and let developers invent the use
cases. We document one flagship recipe (ambient agent status) and a
cookbook of others, framed as "here's one cool thing you can do right now,
among everything else it can do." The breadth is the moat: people build on
Tellie because it's the simplest free surface for this, and every use case
makes Tellie more load-bearing.

(And yes: it's still the teleprompter for your founder/launch video.)

## How it relates to what already ships

The existing `tellie://` URL scheme (see Tellie's `INTEGRATIONS.md`) is the
foundation. The dev API is a consistent superset. One verb set, three doors
(raw URL scheme, CLI, MCP); CLI and MCP just build the URL for you and
handle encoding.

| Verb (CLI / MCP) | URL scheme | Status | Notes |
|---|---|---|---|
| `send_text` / `send_file` | `tellie://send?text=\|file=&source=` | SHIPPED | Script mode: load readable content (teleprompter). |
| `clear` | `tellie://dismiss` (alias) + `tellie://clear?source=` | dismiss SHIPPED; source-scoped NEW | Remove content; all, or one source. |
| `update` | `tellie://update?text=&source=&icon=&attention=` | NEW | Status mode: set/replace a glanceable line. |
| `flash` | `tellie://flash?text=&source=` | NEW | Transient status (auto-clears). |
| `play`/`pause`/`reset`/`set_speed` | `tellie://play` … | reserved → later | The reserved `play`/`export` slots become real. |

Back-compat: `send` and `dismiss` keep working exactly as documented.

## The verb API (general primitives)

**Status mode (the glanceable strip):**
- **`update(text, source?, icon?, attention?)`** — set/replace the strip
  line for `source`. The everything-verb: build state, token/cost meter, a
  timer value, a reminder, a number, anything. `attention: true` adds a
  gentle pulse ("look up"). Does NOT load the teleprompter or reset scroll,
  so it can be called rapidly without churn.
- **`flash(text, source?)`** — show briefly, then auto-clear. A ping/toast
  for milestones ("PR #149 opened").
- **`clear(source?)`** — remove this source's content; omit `source` to
  clear everything (≡ `dismiss`).

**Script mode (the teleprompter):**
- **`send_text(text, source?)` / `send_file(path, source?)`** — load
  readable content to read aloud / expand. (Already shipped as `send`.)

**Playback (later):** `play` / `pause` / `reset` / `set_speed`.

### `send` vs `update` (important distinction)
- `send` = "here is content to READ" → loads scriptText, strip shows a
  preview, click to expand as a teleprompter, peek shows more, scroll
  resets. Heavy.
- `update` = "here is my current STATUS" → sets a short line on the strip
  for that source; replaces in place; no teleprompter load. Light.

### Identity: `source` + `icon`
- `source` — short name shown beside the strip (e.g. `Claude`, `CI`,
  `agent-3`). Already supported on `send`.
- `icon` — NEW. An SF Symbol name (`hammer`, `checkmark.circle`, `bolt`,
  `clock`) or an emoji, so a source carries a visual identity without
  shipping an image over a URL. (The ⌃⌥⌘T hotkey still auto-resolves the
  copied-from app's real icon; `icon=` is the explicit path for dev sends.)

## Multi-source surface (the differentiator)

Each `source` is a distinct identity (name + icon + optional color). Many
sources can report at once (4–5 coding agents across desktops/machines, a
CI feed, several timers).

- **Collapsed strip:** the most-recently-updated source (icon + name + its
  line).
- **Hover to peek:** the full **roster** — every active source and its
  current status, a mission-control list in the notch. Reuses the
  hover-peek surface already built.

This is general infrastructure (serves any multi-source use), not
agent-specific. Tellie-side it means tracking a `source → status` map and
rendering the roster on peek.

## Access layers (three doors, same verbs)

1. **Raw URL scheme** — `open "tellie://update?..."`. Documented in
   `INTEGRATIONS.md`. Caller handles percent-encoding.
2. **CLI** (`@tellie/cli`, `npx -y @tellie/cli` → `tellie update "…"`).
   Builds the URL, handles encoding.
3. **MCP** (`@tellie/mcp`, `npx -y @tellie/mcp`). Exposes the verbs as MCP
   tools so Claude Desktop / OpenClaw / any MCP client can call them. Builds
   the URL, handles encoding. Spike proven.

Cross-machine note: the MCP/CLI drive Tellie on the SAME Mac (`open` is
local). Pushing from another machine (e.g. a Mac mini → a MacBook notch) is
a later option via an SSH "target Mac" setting; out of scope for v1.

## Docs / cookbook (the repo's teaching surface)

1. Quickstart + the verb API (the primitive).
2. Setup three ways: MCP config, CLI install, raw URL scheme.
3. **Cookbook of recipes**, headlined as examples, not the whole pitch:
   - **Flagship, step-by-step: ambient agent status** (Claude / OpenClaw /
     any agent) — `update` as it works, `attention` when it needs you,
     `flash` on milestones, `clear` when done.
   - Build/test status; token + cost meter; pomodoro timer; CI/webhook →
     notch; standup notes / reminders; "now reading" for a founder video.
   - **Bring your own:** here are the verbs, go invent.

## Phased plan (mind the July 1 go/no-go)

- **v1 (aim for launch):** general status verbs (`update`, `flash`,
  `clear`) + existing `send` + `icon` support, single-source (latest
  replaces), exposed via MCP + CLI, with the cookbook. Mac-side: the new
  URL actions (`update`, `flash`, source-scoped `clear`, `icon` param).
- **Fast-follow (the wow):** the multi-source **roster** in the peek
  (mission control). Bigger Mac-side work; natural second beat (Thu Jul 10
  HN / Show HN day fits).
- **Later:** playback verbs; cross-machine (SSH target); `send_file` niceties.

## Distribution

Node/TypeScript. `@tellie/mcp` and `@tellie/cli` published to npm at launch
(`npx -y @tellie/…`). This repo (`ChazinMac/tellie-dev`) is PRIVATE during
development and flipped PUBLIC at launch. Confirm the npm `@tellie` scope is
claimable before launch (fallback: unscoped `tellie-mcp` / `tellie-cli`).

## Open questions

- Exact `attention` visual (pulse vs color vs both).
- Color-per-source for the roster?
- Whether `update` and `send` share the strip rendering or get distinct
  treatments.
- npm scope availability (`@tellie`).
