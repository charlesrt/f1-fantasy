/*
  snapshot.js — the race snapshot: one round on a single shareable card.
  League podium, the weekend in numbers, three highlights and the full standings
  with position changes. Drawn as SVG from the same calculations as the dashboard,
  so it can be saved as a PNG or copied straight into Slack, with a text version
  alongside for screen readers (and for pasting as text).
  Opens as its own view: #snapshot (latest round) or #snapshot-17.
*/
(function () {
  const W = 1080, PAD = 56;
  const C = { ground: '#0A0C0F', panel: '#11151A', panel2: '#161B21', line: '#242B34', fg: '#F2F4F7', muted: '#A3ADBA', faint: '#7D8794',
    red: '#FF3B30', redFill: '#D92B21', purple: '#B57BFF', purpleText: '#E7D6FF', green: '#2FD67B', yellow: '#FFD23F' };
  const SANS = 'Titillium Web, Segoe UI, Helvetica Neue, Arial, sans-serif', MONO = 'JetBrains Mono, SF Mono, Menlo, Consolas, monospace';
  const nf = new Intl.NumberFormat('en-GB');
  const num = (v) => (v < 0 ? '−' : '') + nf.format(Math.abs(v));
  const signed = (v) => (v < 0 ? '−' : '+') + nf.format(Math.abs(v));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s) => document.querySelector(s);
  const section = $('#snapshot');
  if (!section || !window.dash) return;

  // ---------- the round, from the dashboard's own calculations ----------
  const ready = () => ['standings', 'race_stats', 'team_form', 'scores', 'teams', 'calendar'].every((id) => dash.data(id).status === 'ok');
  const rounds = () => [...new Set(dash.data('standings').data.map((s) => +s.round))].sort((a, b) => a - b);

  function build(r) {
    const st = dash.data('standings').data, rs = dash.data('race_stats').data, form = dash.data('team_form').data;
    const teams = dash.data('teams').data, cal = dash.data('calendar').data, scores = dash.data('scores').data;
    const all = rounds(), i = all.indexOf(r);
    const T = Object.fromEntries(teams.map((t) => [t.team, t]));
    const c = cal.find((x) => +x.round === r) || {};
    const next = cal.filter((x) => +x.round > all[all.length - 1]).sort((a, b) => a.round - b.round)[0];
    const stat = rs.find((x) => +x.round === r);
    const table = st.filter((s) => +s.round === r).sort((a, b) => a.rank - b.rank);
    const podium = scores.filter((s) => +s.round === r).sort((a, b) => b.points - a.points).slice(0, 3);
    const climber = table.filter((s) => s.change > 0).sort((a, b) => b.change - a.change || a.rank - b.rank)[0];
    const battle = table.slice(1).map((s, k) => ({ a: table[k], b: s, gap: table[k].cum - s.cum })).filter((f) => f.a.rank > 1).sort((x, y) => x.gap - y.gap)[0];
    const hot = form.filter((f) => +f.upto === r && f.n >= 3).sort((a, b) => b.last3 - a.last3)[0];
    const date = c.date ? new Date(c.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' }) : '';
    return { r, prev: i > 0 ? all[i - 1] : null, next: i < all.length - 1 ? all[i + 1] : null, latest: all[all.length - 1],
      gp: (c.grand_prix || 'Round ' + r).replace(/ \(at (.*)\)/, ' at $1'), code: c.code || '', circuit: c.circuit || '', date, sprint: !!c.sprint,
      stat, table, podium, climber, battle, hot, T, nextRace: next, total: cal.length };
  }

  // ---------- the card, as SVG ----------
  function svg(d) {
    const ROWH = 40, rowsTop = 900, H = rowsTop + 48 + d.table.length * ROWH + 96;
    const o = [];
    const text = (x, y, s, a) => o.push('<text x="' + x + '" y="' + y + '"' + (a || '') + '>' + esc(s) + '</text>');
    const mono = (sz, w, fill, anchor) => ' font-family="' + MONO + '" font-size="' + sz + '" font-weight="' + (w || 500) + '" fill="' + (fill || C.fg) + '"' + (anchor ? ' text-anchor="' + anchor + '"' : '');
    const sans = (sz, w, fill, anchor) => ' font-family="' + SANS + '" font-size="' + sz + '" font-weight="' + (w || 400) + '" fill="' + (fill || C.fg) + '"' + (anchor ? ' text-anchor="' + anchor + '"' : '');
    const fit = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
    o.push('<rect width="' + W + '" height="' + H + '" fill="' + C.ground + '"/>');
    for (let x = 60; x < W; x += 60) o.push('<line x1="' + x + '" y1="0" x2="' + x + '" y2="' + H + '" stroke="#F2F4F7" stroke-opacity=".035"/>');
    for (let y = 60; y < H; y += 60) o.push('<line x1="0" y1="' + y + '" x2="' + W + '" y2="' + y + '" stroke="#F2F4F7" stroke-opacity=".035"/>');
    o.push('<rect width="410" height="8" fill="' + C.red + '"/><rect x="432" width="22" height="8" fill="' + C.red + '"/><rect x="475" width="11" height="8" fill="' + C.red + '"/>');

    // header
    text(PAD, 72, 'ASTON MARTPX F1 FANTASY · RACE SNAPSHOT', mono(20, 500, C.muted) + ' letter-spacing="3"');
    const tag = 'R' + d.r, tw = 26 + tag.length * 15;
    o.push('<rect x="' + PAD + '" y="98" width="' + tw + '" height="44" rx="6" fill="' + C.redFill + '"/>');
    text(PAD + tw / 2, 128, tag, mono(22, 700, C.fg, 'middle'));
    text(PAD + tw + 18, 136, fit(d.gp, 30), sans(50, 700));
    text(PAD, 182, [d.circuit, d.date, d.sprint ? 'Sprint weekend' : '', 'Round ' + d.r + ' of ' + d.total].filter(Boolean).join('  ·  '), sans(22, 400, C.muted));

    // league podium: P2, P1, P3
    text(PAD, 238, 'LEAGUE PODIUM', mono(18, 600, C.muted) + ' letter-spacing="2.5"');
    const colW = 300, gap = 22, x0 = (W - (colW * 3 + gap * 2)) / 2, base = 536, hts = [176, 132, 100];
    [1, 0, 2].forEach((p, k) => {
      const s = d.podium[p]; if (!s) return;
      const x = x0 + k * (colW + gap), h = hts[p], col = d.T[s.team].color, best = p === 0;
      o.push('<rect x="' + x + '" y="' + (base - h) + '" width="' + colW + '" height="' + h + '" rx="10" fill="' + C.panel2 + '"/>');
      o.push('<rect x="' + x + '" y="' + (base - h) + '" width="' + colW + '" height="5" rx="2" fill="' + col + '"/>');
      text(x + colW / 2, base - h + 56, 'P' + (p + 1), mono(40, 700, C.fg, 'middle'));
      text(x + colW / 2, base - h - 58, fit(s.team, 22), sans(26, 600, C.fg, 'middle'));
      text(x + colW / 2, base - h - 18, (best ? '◆ ' : '') + nf.format(s.points) + ' pts', mono(30, 700, best ? C.purpleText : C.fg, 'middle'));
    });

    // the weekend in numbers
    const s = d.stat, tiles = [['MEDIAN', nf.format(s.median), 'typical team'], ['WIN MARGIN', nf.format(s.margin || 0), 'P1 over P2'],
      ['SPREAD', nf.format(s.spread), 'best to lowest'], ['BEAT MEDIAN', s.beat_median + ' / ' + s.n, 'teams'], ['LOWEST', num(s.low), fit(s.low_team, 16)]];
    const tw2 = (W - PAD * 2 - 4 * 12) / 5;
    tiles.forEach(([k, v, sub], j) => {
      const x = PAD + j * (tw2 + 12);
      o.push('<rect x="' + x + '" y="574" width="' + tw2 + '" height="112" rx="10" fill="' + C.panel + '" stroke="' + C.line + '"/>');
      text(x + 16, 604, k, mono(14, 600, C.muted) + ' letter-spacing="1.5"');
      text(x + 16, 646, v, mono(30, 700));
      text(x + 16, 672, sub, sans(16, 400, C.muted));
    });

    // three highlights
    const hl = [
      ['BIGGEST CLIMBER', d.climber ? d.climber.team : 'No movers', d.climber ? '▲ ' + d.climber.change + ' to P' + d.climber.rank : 'Same order as last round', d.climber ? C.green : C.muted, d.climber && d.T[d.climber.team].color],
      ['TIGHTEST BATTLE', d.battle ? 'P' + d.battle.a.rank + ' ' + d.battle.a.code + ' v P' + d.battle.b.rank + ' ' + d.battle.b.code : '—', d.battle ? nf.format(d.battle.gap) + (d.battle.gap === 1 ? ' point apart' : ' points apart') : '', C.yellow, null],
      ['IN FORM', d.hot ? d.hot.team : '—', d.hot ? nf.format(Math.round(d.hot.last3)) + ' avg, last 3 rounds' : '', C.purple, d.hot && d.T[d.hot.team].color],
    ];
    const hw = (W - PAD * 2 - 2 * 16) / 3;
    hl.forEach(([k, v, sub, accent, team], j) => {
      const x = PAD + j * (hw + 16);
      o.push('<rect x="' + x + '" y="712" width="' + hw + '" height="128" rx="10" fill="' + C.panel + '" stroke="' + C.line + '"/>');
      o.push('<rect x="' + x + '" y="712" width="4" height="128" rx="2" fill="' + accent + '"/>');
      text(x + 22, 744, k, mono(14, 600, C.muted) + ' letter-spacing="1.5"');
      if (team) o.push('<rect x="' + (x + 22) + '" y="764" width="4" height="26" rx="2" fill="' + team + '"/>');
      text(x + (team ? 36 : 22), 786, fit(v, 22), sans(26, 600));
      text(x + 22, 818, sub, mono(16, 500, C.muted));
    });

    // championship standings
    text(PAD, rowsTop - 14, 'CHAMPIONSHIP AFTER R' + d.r, mono(18, 600, C.muted) + ' letter-spacing="2.5"');
    const cols = { pos: PAD + 8, mv: PAD + 76, team: PAD + 150, rp: W - PAD - 300, tot: W - PAD - 150, gap: W - PAD - 8 };
    const hy = rowsTop + 24;
    [['POS', cols.pos, 'start'], ['+/−', cols.mv, 'middle'], ['TEAM', cols.team, 'start'], ['ROUND', cols.rp, 'end'], ['TOTAL', cols.tot, 'end'], ['GAP', cols.gap, 'end']]
      .forEach(([t, x, a]) => text(x, hy, t, mono(14, 600, C.faint, a) + ' letter-spacing="1.5"'));
    d.table.forEach((row, k) => {
      const y = rowsTop + 48 + k * ROWH, mid = y + ROWH / 2 + 7, col = d.T[row.team].color, best = row.race_pts !== null && row.race_pts === s.top;
      if (k % 2 === 0) o.push('<rect x="' + PAD + '" y="' + y + '" width="' + (W - PAD * 2) + '" height="' + ROWH + '" rx="6" fill="' + C.panel + '"/>');
      text(cols.pos, mid, 'P' + row.rank, mono(20, 700));
      const ch = row.change, mv = ch === null ? 'NEW' : ch > 0 ? '▲' + ch : ch < 0 ? '▼' + -ch : '•';
      text(cols.mv, mid, mv, mono(17, 700, ch > 0 || ch === null ? C.green : ch < 0 ? C.yellow : C.faint, 'middle'));
      o.push('<rect x="' + cols.team + '" y="' + (y + 9) + '" width="4" height="' + (ROWH - 18) + '" rx="2" fill="' + col + '"/>');
      text(cols.team + 16, mid, fit(row.team, 30), sans(21, 600));
      text(cols.rp, mid, row.race_pts === null ? '—' : (best ? '◆ ' + nf.format(row.race_pts) : signed(row.race_pts)), mono(19, best ? 700 : 500, best ? C.purpleText : C.muted, 'end'));
      text(cols.tot, mid, nf.format(row.cum), mono(20, 700, C.fg, 'end'));
      text(cols.gap, mid, row.rank === 1 ? 'Leader' : '−' + nf.format(row.gap), mono(18, 500, C.muted, 'end'));
    });

    // footer
    const fy = H - 44;
    o.push('<line x1="' + PAD + '" y1="' + (fy - 30) + '" x2="' + (W - PAD) + '" y2="' + (fy - 30) + '" stroke="' + C.line + '"/>');
    text(PAD, fy, '◆ race best   ▲▼ places gained or lost since last round', mono(15, 500, C.muted));
    if (d.nextRace && d.r === d.latest) text(W - PAD, fy, 'NEXT · R' + d.nextRace.round + ' ' + d.nextRace.code + ' · ' + new Date(d.nextRace.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }), mono(15, 600, C.fg, 'end'));
    return { H, body: o.join('') };
  }

  // ---------- the same story, as text (screen readers, and pasting into Slack) ----------
  function words(d) {
    const s = d.stat, lines = [];
    lines.push('R' + d.r + ' ' + d.gp + (d.date ? ', ' + d.date : ''));
    lines.push('League podium: ' + d.podium.map((p, i) => (i + 1) + '. ' + p.team + ' ' + nf.format(p.points)).join(', ') + '.');
    lines.push('Weekend in numbers: median ' + nf.format(s.median) + ', winning margin ' + nf.format(s.margin || 0) + ', spread ' + nf.format(s.spread) + ', ' + s.beat_median + ' of ' + s.n + ' teams beat the median, lowest ' + num(s.low) + ' (' + s.low_team + ').');
    const hl = [];
    if (d.climber) hl.push('biggest climber ' + d.climber.team + ', up ' + d.climber.change + ' to P' + d.climber.rank);
    if (d.battle) hl.push('tightest battle P' + d.battle.a.rank + ' ' + d.battle.a.team + ' v P' + d.battle.b.rank + ' ' + d.battle.b.team + ', ' + nf.format(d.battle.gap) + ' apart');
    if (d.hot) hl.push('in form ' + d.hot.team + ', averaging ' + nf.format(Math.round(d.hot.last3)) + ' over the last three rounds');
    if (hl.length) lines.push('Highlights: ' + hl.join('; ') + '.');
    lines.push('Championship after R' + d.r + ':');
    d.table.forEach((row) => {
      const ch = row.change, mv = ch === null ? 'new' : ch > 0 ? 'up ' + ch : ch < 0 ? 'down ' + -ch : 'no change';
      lines.push('P' + row.rank + ' ' + row.team + ', ' + nf.format(row.cum) + (row.rank === 1 ? '' : ' (−' + nf.format(row.gap) + ')') + ', ' + mv + (row.race_pts === null ? '' : ', ' + num(row.race_pts) + ' this round'));
    });
    return lines;
  }

  // ---------- render the view ----------
  let cur = null;
  const status = $('#snap-status');
  function render(r) {
    if (!ready()) return;
    const all = rounds();
    if (!all.includes(r)) r = all[all.length - 1];
    const d = build(r), card = svg(d), lines = words(d);
    cur = { d, card, lines };
    const box = $('#snap-card');
    box.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + card.H + '" role="img" aria-labelledby="snap-svg-title" aria-describedby="snap-text-h">' +
      '<title id="snap-svg-title">Race snapshot for R' + d.r + ' ' + esc(d.gp) + '. The same information follows as text.</title>' + card.body + '</svg>';
    $('#snap-title').textContent = 'Race snapshot · R' + d.r + ' ' + d.gp;
    const sel = $('#snap-round');
    if (sel.options.length !== all.length) {
      const cal = dash.data('calendar').data;
      sel.replaceChildren(...all.map((x) => { const c = cal.find((y) => +y.round === x) || {}; return new Option('R' + x + ' · ' + (c.grand_prix || '').replace(/ \(at .*\)/, ''), x); }));
    }
    sel.value = String(r);
    $('#snap-prev').disabled = d.prev === null; $('#snap-next').disabled = d.next === null;
    const list = $('#snap-text'); list.replaceChildren(...lines.map((l) => { const li = document.createElement('li'); li.textContent = l; return li; }));
    status.textContent = '';
    if (dash.setLink) dash.setLink('snapshot-' + r);
  }

  // PNG: the SVG drawn onto a canvas at 2× for a crisp image in Slack
  function toPng() {
    return new Promise((resolve, reject) => {
      const src = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + cur.card.H + '" viewBox="0 0 ' + W + ' ' + cur.card.H + '">' + cur.card.body + '</svg>';
      const img = new Image();
      img.onload = () => {
        const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = cur.card.H * 2;
        const g = cv.getContext('2d'); g.scale(2, 2); g.drawImage(img, 0, 0);
        cv.toBlob((b) => (b ? resolve(b) : reject(new Error('no image'))), 'image/png');
      };
      img.onerror = () => reject(new Error('image failed'));
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src);
    });
  }
  const fileName = () => 'aston-martpx-R' + cur.d.r + '-' + (cur.d.code || 'snapshot').toLowerCase() + '.png';
  $('#snap-download').addEventListener('click', async () => {
    try {
      const b = await toPng(), a = document.createElement('a');
      a.href = URL.createObjectURL(b); a.download = fileName(); document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      status.textContent = 'Saved ' + fileName() + '.';
    } catch (e) { status.textContent = 'Couldn’t make the image here. Try Copy image, or take a screenshot.'; }
  });
  $('#snap-copy').addEventListener('click', async () => {
    try {
      if (!window.ClipboardItem) throw new Error('no clipboard');
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': toPng() })]);
      status.textContent = 'Image copied — paste it into Slack.';
    } catch (e) { status.textContent = 'This browser won’t copy images here. Use Download PNG instead.'; }
  });
  $('#snap-copy-text').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(cur.lines.join('\n')); status.textContent = 'Text copied — paste it into Slack.'; } catch (e) { status.textContent = 'Couldn’t copy. Select the text version below instead.'; }
  });
  $('#snap-round').addEventListener('change', (e) => render(+e.target.value));
  $('#snap-prev').addEventListener('click', () => cur && cur.d.prev !== null && render(cur.d.prev));
  $('#snap-next').addEventListener('click', () => cur && cur.d.next !== null && render(cur.d.next));

  // shown by the views code in app.js; the round comes from the link, the button, or the latest
  window.TLSnapshot = { render: (r) => render(r || (rounds().slice(-1)[0])) };
  dash.onData(() => { if (!section.hidden && ready() && !cur) render(+(/^#snapshot-(\d+)$/.exec(location.hash) || [])[1]); });
})();
