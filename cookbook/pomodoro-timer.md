# Recipe: Pomodoro / countdown timer

A focus timer that lives in the notch, counting down at a glance and
nudging you when the interval ends.

## Bash (25-minute pomodoro)

```bash
mins=25
for (( m=mins; m>0; m-- )); do
  tellie update "$m min left" --source Pomodoro --icon clock
  sleep 60
done
tellie update "Break time" --source Pomodoro --icon cup.and.saucer --attention
( sleep 30; tellie clear --source Pomodoro ) &
```

## Notes

- `update` replaces the line each minute, so it ticks down in place.
- The final `--attention` pulses orange so the end of the interval grabs
  you even if you're heads-down.
- Drop this in a shell function (`pom`) and you've got a notch pomodoro in
  one command.
