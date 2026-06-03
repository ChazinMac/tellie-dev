# Recipe: Build / test status

Wrap a build or test command so the notch shows live progress and the
result, without watching the terminal.

## Bash

```bash
tellie update "Building…" --source make --icon hammer
if make; then
  tellie flash "Build passed" --source make --icon checkmark.circle
else
  tellie update "Build failed" --source make --icon exclamationmark.triangle --attention
fi
```

## Tests (with a final clear)

```bash
tellie update "Running tests…" --source pytest --icon flask
if pytest -q; then
  tellie flash "All tests passed" --source pytest --icon checkmark.circle
else
  tellie update "Tests failing — look" --source pytest --icon xmark.octagon --attention
fi
# optional: sign off after a moment
( sleep 8; tellie clear --source pytest ) &
```

## Notes

- `--attention` makes the failure pulse orange so you actually notice it.
- Use a distinct `--source` per tool so build and test status sit side by
  side in the roster (hover to see both).
