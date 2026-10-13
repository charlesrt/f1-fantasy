# aston martpx · F1 Fantasy Telemetry

A static site for aston martpx, an F1 Fantasy league, 2026: race scores, the cumulative championship, position changes, the timing-screen grid, and three animations (grid race, world tour, race recap) that play in the page and update themselves from the data. It's plain HTML, CSS and JavaScript, with no build step and no server code, so it runs on GitHub Pages for free.

## What's in here

```
index.html                 the page markup (dashboard, accessibility statement, animation player)
assets/css/site.css        website-only basics: fonts, page background
assets/css/styles.css      the dashboard's look (telemetry style, dark theme)
assets/js/d3.v7.min.js     charting library (d3 v7.9.0, bundled so the site needs no CDN)
assets/js/dash.js          reads /data, runs the calculations, keeps the view in the address bar
assets/js/calc.js          the derived tables: standings, race stats, points grid, team form
assets/js/app.js           draws every card, chart and table, and the race story at the top
assets/js/films.js         the animation player: grid race, world tour and race recap
assets/js/snapshot.js      the race snapshot: any round on one card, to save or copy into Slack
assets/films/              each animation's scenes, plus the globe and circuit outlines (geo.js)
assets/og.png              the link-preview picture (1200 × 630, content kept in the centre square)
assets/icons/              the site icon in every size browsers and phones ask for
favicon.ico                the classic browser-tab icon
site.webmanifest           names the icons for phones that add the site to their home screen
data/                      the league data as editable script files (see data/README.md)
tools/a11y-check.mjs       accessibility checks (WCAG 2.2 AA), run on every push by GitHub
.github/workflows/         the GitHub Action that runs those checks
.nojekyll                  tells GitHub Pages to serve the files as they are
```

## After each race

1. Add the new round's scores to `data/scores.js`, plus chips and picks if you have them, and mark the round as `In league data` in `data/calendar.js` (`data/README.md` has the details).
2. Commit. GitHub Pages republishes automatically. That round's race recap, the grid race and the world tour all include it straight away; there's nothing to export.
3. Share it: open the **Race snapshot** and press **Copy image** (or **Download PNG**) and paste it into Slack, or open the recap (**Play recap** on the race podium card), press **Copy link** and paste that.

## Shareable views

The films have links too: `#film-grid` opens the grid race and `#film-tour` the world tour. In either, drag the slider or use ← → to skip 5 seconds, and Space to pause.

Every round's race recap has its own link: `#recap-17` at the end of the address opens and plays the Singapore recap. Use ◀ ▶ (or the arrow keys) in the recap to step through rounds, and Space to pause.

The round picker and focus team are saved in the address bar, so a link like `?round=9&team=Champion_1` opens the dashboard as it stood after Silverstone, focused on that team.

## Accessibility checks

The site aims for WCAG 2.2 AA, and the footer links to its accessibility statement. Every push to GitHub runs `tools/a11y-check.mjs`, which checks the dashboard, each animation and the statement with axe-core, and makes sure keyboard focus never hides under the pinned season bar. To run it yourself: `npm install`, `npx playwright install chromium`, then `npm run check`. A failure shows as a red cross on the commit.

## Credits

Calendar from the revised 2026 FIA Formula 1 schedule: Saudi Arabia cancelled, and the Bahrain GP moved to Sepang, Malaysia, giving 23 rounds. The films' circuit outlines come from [bacinger/f1-circuits](https://github.com/bacinger/f1-circuits) (MIT licence). This is a fan league and isn't affiliated with Formula 1.
