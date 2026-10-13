/*
  calc.js — the league's derived tables, registered with dash.calc so every card
  reads the same numbers: standings after each round, field stats per round, the
  points grid, and each team's form. Pure functions of scores and teams.
*/
(function () {
  dash.calc('standings', {
    title: 'Standings after each round',
    description: 'Running total, race points, position, gap to leader and points per race for every team after each round.',
    inputs: ['scores', 'teams'],
    fn: (scores, teams) => {
      const rounds = [...new Set(scores.map((s) => +s.round))].sort((a, b) => a - b);
      const cum = {}, races = {}, prev = {}, out = [];
      for (const r of rounds) {
        const rows = [];
        for (const t of teams) {
          if (+t.joined_round > r) continue;
          const s = scores.find((x) => x.team === t.team && +x.round === r);
          const pts = s ? +s.points : null;
          cum[t.team] = (cum[t.team] || 0) + (pts || 0);
          if (pts !== null) races[t.team] = (races[t.team] || 0) + (/combined/i.test(s.note || '') ? 2 : 1);
          rows.push({ team: t.team, code: t.code, round: r, race_pts: pts, cum: cum[t.team], races: races[t.team] || 0 });
        }
        rows.sort((a, b) => b.cum - a.cum || a.team.localeCompare(b.team));
        rows.forEach((row, i) => {
          row.rank = i + 1;
          row.gap = rows[0].cum - row.cum;
          row.prev_rank = prev[row.team] ?? null;
          row.change = row.prev_rank === null ? null : row.prev_rank - row.rank;
          row.avg = row.races ? Math.round((row.cum / row.races) * 10) / 10 : null;
        });
        rows.forEach((row) => { prev[row.team] = row.rank; });
        out.push(...rows);
      }
      return out;
    },
  });

  dash.calc('race_stats', {
    title: 'Field stats per round',
    description: 'Best, lowest, mean and median league score in each round, the winning margin, the spread (best minus lowest) and how many teams beat the median.',
    inputs: ['scores'],
    fn: (scores) => {
      const rounds = [...new Set(scores.map((s) => +s.round))].sort((a, b) => a - b);
      return rounds.map((r) => {
        const rs = scores.filter((s) => +s.round === r).map((s) => ({ team: s.team, p: +s.points })).sort((a, b) => b.p - a.p);
        const v = rs.map((x) => x.p), n = v.length, asc = [...v].sort((a, b) => a - b);
        const median = n % 2 ? asc[(n - 1) / 2] : (asc[n / 2 - 1] + asc[n / 2]) / 2;
        return { round: r, n, top: rs[0].p, top_team: rs[0].team, low: rs[n - 1].p, low_team: rs[n - 1].team,
          mean: Math.round((v.reduce((a, b) => a + b, 0) / n) * 10) / 10, median,
          second_team: n > 1 ? rs[1].team : null, margin: n > 1 ? rs[0].p - rs[1].p : null,
          spread: rs[0].p - rs[n - 1].p, beat_median: v.filter((x) => x > median).length };
      });
    },
  });

  dash.calc('grid', {
    title: 'Points grid',
    description: 'Each team’s points in each round, one row per team, one column per round.',
    inputs: ['scores', 'teams'],
    fn: (scores, teams) => teams.map((t) => {
      const row = { team: t.team, code: t.code };
      scores.filter((s) => s.team === t.team).forEach((s) => { row['r' + s.round] = +s.points; });
      return row;
    }),
  });

  dash.calc('team_form', {
    title: 'Team form up to each round',
    description: 'For each team and cut-off round, best and worst score, spread (standard deviation) and last-three-round average.',
    inputs: ['scores'],
    fn: (scores) => {
      const rounds = [...new Set(scores.map((s) => +s.round))].sort((a, b) => a - b);
      const teamsList = [...new Set(scores.map((s) => s.team))];
      const out = [];
      for (const team of teamsList) for (const upto of rounds) {
        const rs = scores.filter((s) => s.team === team && +s.round <= upto && !/combined/i.test(s.note || '')).sort((a, b) => a.round - b.round);
        if (!rs.length) continue;
        const v = rs.map((s) => +s.points);
        const best = rs.reduce((a, b) => (+b.points > +a.points ? b : a));
        const worst = rs.reduce((a, b) => (+b.points < +a.points ? b : a));
        const mean = v.reduce((a, b) => a + b, 0) / v.length;
        const sd = v.length > 1 ? Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / (v.length - 1)) : null;
        const l3 = v.slice(-3);
        out.push({ team, upto, best: +best.points, best_round: +best.round, worst: +worst.points, worst_round: +worst.round,
          sd: sd === null ? null : Math.round(sd), last3: Math.round((l3.reduce((a, b) => a + b, 0) / l3.length) * 10) / 10, n: v.length });
      }
      return out;
    },
  });

})();
