# Auto-pulse your PRs to the notch

You open a PR, then forget to share the link, and your reviewer is left
refreshing GitHub. The fix isn't "remember harder", it's to make it automatic:
every PR you open lands in the notch as a clickable row, with zero memory
required. (We know the failure mode well: even Claude kept forgetting to hand
over its PR links, so we automated it instead.)

## The idea

One tiny script resolves the PR for a branch and pulses its link to the notch.
Wire it into either the moment you *create* a PR (a `gh` alias) or the moment
you *push* a branch (a git hook). Needs Tellie + the `tellie` CLI
(`npm i -g @tellie/cli`) and the GitHub CLI (`gh`).

## 1. The pulse helper

Save this as `~/.tellie-pr-pulse.sh` and `chmod +x` it. It pulses the branch's
PR link, or a "open a PR" link if there isn't one yet, and never blocks
anything.

```bash
#!/bin/bash
branch="${1:-$(git rev-parse --abbrev-ref HEAD 2>/dev/null)}"
case "$branch" in ""|main|master) exit 0 ;; esac

url=$(gh pr view "$branch" --json url -q .url 2>/dev/null)
if [ -n "$url" ]; then
  text="PR ready: $branch"
else
  url="$(gh repo view --json url -q .url)/pull/new/$branch"; text="Open a PR for $branch"
fi

[ -n "$url" ] && tellie update "$text" --source Claude --icon arrow.triangle.pull --link "$url"
exit 0
```

## 2. Option A: a gh alias (fires when you open a PR)

Make a `prc` alias that creates the PR *and* pulses it in one command, then use
`gh prc` wherever you'd type `gh pr create`. Now it's one action, impossible to
forget half of.

```bash
gh alias set prc --shell 'gh pr create "$@" && ~/.tellie-pr-pulse.sh'

# from now on:
gh prc --title "Fix the thing" --body "…"
```

## 3. Option B: a git hook (fully hands-free)

Prefer to type nothing extra? A `pre-push` hook pulses the PR link (or an "open
a PR" link) every time you push a branch. No new command to remember at all.
Add it per repo:

```bash
printf '#!/bin/sh\n~/.tellie-pr-pulse.sh &\nexit 0\n' > .git/hooks/pre-push
chmod +x .git/hooks/pre-push
```

It runs in the background and always exits 0, so it never slows down or blocks
your push. Want it in every repo at once? Point
`git config --global core.hooksPath ~/.githooks` at a shared hooks dir and drop
the same file there.

## Good to know

- **This is the real fix for "agents forget to share links."** Don't rely on
  memory (human or AI), bind the pulse to the action. The link-handoff is only
  as reliable as the automation behind it.
- **Pick one or both.** The alias gives you the exact PR link the instant you
  open it; the hook is zero-effort on every push. Run both and you're covered
  either way.
- **It's free.** No Pro needed, just the `tellie://` primitive, the CLI, and
  `gh`.

Live version: <https://tellieapp.com/developers/cookbook/auto-pulse-prs>

See also: [CI status in the notch](ci-to-notch.md),
[Make your AI agent narrate to your notch](narrate-to-your-notch.md).
