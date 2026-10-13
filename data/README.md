# League data

Every chart, table and figure on the dashboard is worked out from the three files in this folder. Edit them in any text editor, or straight in GitHub's web editor, commit, and the site updates.

Each file is ordinary JSON wrapped in one line of JavaScript, `window.LEAGUE_DATA.scores = [ … ];`. That wrapper is what lets `index.html` open with a double-click, with no server. Only edit what's between the square brackets.

## `scores.js`: one entry per team per round

```json
{ "team": "Champion_1", "round": 12, "points": 241, "note": "" }
```

- `team` must match a `team` in `teams.js` exactly.
- `round` is the round number in `calendar.js`: Zandvoort is 12, Monza 13, Madrid 14, Baku 15, Sepang (the relocated Bahrain GP) 16 and Singapore 17.
- `note` is free text shown nowhere in the charts; it records things like "Joined" or "Raced as Smoth Oppo".
- Leave a team out of any round they didn't play. Negative scores are fine.
- Put a comma between entries, but not after the last one.

### Optional fields: add them whenever you have them

```json
{ "team": "Champion_1", "round": 12, "points": 241,
  "chip": "Wildcard",
  "drivers": ["NOR", "PIA", "LEC", "HAD", "BEA"],
  "constructors": ["MCL", "FER"],
  "cost_cap_left": 1.4 }
```

| Field | What it is | What it unlocks |
| --- | --- | --- |
| `chip` | The chip played that round, as text | "Chips played", with each chip round scored against that team's own average |
| `drivers` | The five drivers, as short codes | "Most picked drivers" for the round, with the focus team's picks highlighted |
| `constructors` | The two constructors, as short codes | "Most picked constructors" |
| `cost_cap_left` | Budget left unspent, in millions | Shown with the team's line-up |

Use the same code for a driver every time (for example always `NOR`), because the dashboard counts picks by matching the text exactly. Leave a field out wherever you don't have it; older rounds are fine without it.

**After each race:** add one entry per team for the new round, then change that round's `status` in `calendar.js` to `"In league data"`.

## `teams.js`: one entry per team

`code` is the three-letter timing code, `color` the chart colour, and `joined_round` the first round the team played. Add a new team here before giving it scores.

## `calendar.js`: the 2026 calendar

The 23 rounds, with circuit, date and coordinates. `status` is one of `In league data`, `Awaiting league data` or `Upcoming`.
