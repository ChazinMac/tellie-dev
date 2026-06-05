# Tellie Pulse — terminal cheatsheet

Paste any line into your terminal. Each uses `open -g` so Tellie receives the
message in the background and never steals your keyboard focus.

> **Does each one overwrite the last?** It depends on `source`.
> **Same `source`** updates that line in place (overwrites).
> **Different `source`** stacks as a new row, hover the notch to see the whole
> roster. `source` is the identity: reuse it to update, vary it to build a list.

## Basics

```bash
# the simplest line
open -g "tellie://update?text=Hello%20notch&source=demo"

# add an SF Symbol icon (auto-colored by source name in the roster)
open -g "tellie://update?text=Building&source=demo&icon=hammer"

# update the SAME source again -> overwrites the line above
open -g "tellie://update?text=Build%20passed&source=demo&icon=checkmark.circle"
```

## Build a roster (different sources stack)

```bash
open -g "tellie://update?text=Compiling&source=build&icon=hammer"
open -g "tellie://update?text=312%2F312%20passing&source=pytest&icon=checklist"
open -g "tellie://update?text=Deployed&source=deploy&icon=arrow.up.circle"
# now hover the notch -> three colored rows
```

## Attention (orange "look up" pulse)

```bash
open -g "tellie://update?text=Needs%20your%20review&source=agent-7&icon=bell&attention=1"
```

## Clickable row (opens a link on click)

The `link` must be percent-encoded.

```bash
open -g "tellie://update?text=PR%20%23204%20ready&source=agent-7&icon=arrow.triangle.pull&link=https%3A%2F%2Fgithub.com%2Facme%2Fapp%2Fpull%2F204"
```

## Emoji icon (percent-encode it)

🚀 = `%F0%9F%9A%80`. Emoji keep their own colors.

```bash
open -g "tellie://update?text=Shipped&source=rocket&icon=%F0%9F%9A%80"
```

## Flash (transient, vanishes after a few seconds)

```bash
open -g "tellie://flash?text=Saved&source=demo&icon=checkmark.circle"
```

## Clear / dismiss

```bash
open -g "tellie://clear?source=demo"   # remove one source's line
open -g "tellie://dismiss"             # clear everything back to the bare notch
```

## Encoding cheatsheet

| char | encode | | char | encode |
|---|---|---|---|---|
| space | `%20` | | `#` | `%23` |
| `/` | `%2F` | | `:` | `%3A` |
| `&` | `%26` | | `?` | `%3F` |

**Tip:** give each tool or agent one consistent `source` name and its icon
keeps the same color across sessions.

Prefer not to hand-encode? The [`tellie` CLI](cli/) does it for you:

```bash
tellie update "Build passed" --source build --icon hammer
```

See also the [cookbook](cookbook/) for full recipes (narrate to your notch,
mine your Pulse Log, fleet coordination, and more).
