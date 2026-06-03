# @tellie/cli

A `tellie` command-line tool for [Tellie](https://tellie.skytech.io)'s
silent second screen (the Mac notch). Thin wrapper over the public
`tellie://` URL scheme; no private API, works against any installed Tellie
build. Encoding is handled for you.

Status: **v0** — `send` and `dismiss` (the shipped Tellie verbs).
`update` / `flash` arrive once the Tellie app ships those URL actions
(see `../TELLIE-FOR-DEVS-SPEC.md`).

## Use

```bash
tellie send "You're on in 5 minutes" --source Calendar
tellie send --file ./script.md --source Drafts
echo "piped text" | tellie send --source pipe
tellie dismiss
tellie --help
```

Requires a Mac with Tellie installed and running.

## Run locally (pre-publish)

```bash
cd tellie-dev/cli
node index.mjs send "hello" --source test
```

> At launch this publishes to npm, so users run `npx -y @tellie/cli ...`
> (or install it globally) instead of a local checkout.
