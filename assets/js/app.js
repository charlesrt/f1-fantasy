/* app.js — draws every card from the league data. Needs d3, dash.js (or the Claude dashboard runtime) and calc.js. */
(function () {
  const $ = (s) => document.querySelector(s);
  const fmt = d3.format(',');
  const fmt1 = d3.format(',.1f');
  const enc = (s) => String(s).replace(/%/g, '%25').replace(/&/g, '%26').replace(/=/g, '%3D');
  const signed = (n) => (n > 0 ? '+' : n < 0 ? '−' : '±') + fmt(Math.abs(n));

  // ---------- state helpers ----------
  const tip = document.createElement('div');
  tip.className = 'tl-tip';
  tip.setAttribute('role', 'presentation');
  let hoverTeam = null;
  let playing = null;
  const towerSort = { k: 'rank', dir: 1 };

  const setFocus = (team) => dash.setParams({ focus: team || null });
  $('#focus').addEventListener('change', (e) => setFocus(e.target.value));

  function ready(ids) { return ids.every((id) => dash.data(id).status === 'ok'); }
  function failed(ids) { return ids.some((id) => ['error', 'connect', 'declined', 'missing'].includes(dash.data(id).status)); }
  function failBox(el) { el.classList.remove('dash-skeleton'); el.replaceChildren(); const d = document.createElement('div'); d.className = 'tl-fail'; d.textContent = 'Failed to load'; el.appendChild(d); }

  function roundLabel(cal, r) {
    const c = cal.find((x) => +x.round === r);
    return { short: c ? c.code : 'R' + r, long: c ? c.grand_prix : 'Round ' + r, tag: 'R' + r, circuit: c ? c.circuit : '' };
  }

  // tags a figure with the dataset, field and row it came from (used by the Claude dashboard)
  function mark(el, source, field, where) {
    el.setAttribute('data-source', source);
    if (field) el.setAttribute('data-field', field);
    if (where) el.setAttribute('data-where', where);
  }

  // play button
  $('#play').addEventListener('click', () => {
    if (playing) { stopPlay(); return; }
    const rounds = [...new Set(dash.data('scores').data.map((s) => +s.round))].sort((a, b) => a - b);
    let i = 0;
    $('#play-ico').textContent = '■'; $('#play-txt').textContent = 'Stop';
    dash.setParams({ upto: rounds[0] });
    playing = setInterval(() => {
      i += 1;
      if (i >= rounds.length) { stopPlay(); return; }
      dash.setParams({ upto: rounds[i] });
    }, 1500);
  });
  function stopPlay() { if (playing) $('#season-live').textContent = 'Replay stopped.'; clearInterval(playing); playing = null; $('#play-ico').textContent = '▶'; $('#play-txt').textContent = 'Replay season'; }

  // tower sort
  document.querySelectorAll('#tower th[data-k]').forEach((th) => th.querySelector('button').addEventListener('click', () => {
    const k = th.dataset.k;
    towerSort.dir = towerSort.k === k ? -towerSort.dir : (k === 'team' || k === 'rank' || k === 'gap' ? 1 : -1);
    towerSort.k = k;
    draw();
  }));
  $('#tower tbody').addEventListener('click', (e) => { const tr = e.target.closest('tr[data-team]'); if (tr) setFocus(tr.dataset.team); });
  $('#sectors tbody').addEventListener('click', (e) => { const tr = e.target.closest('tr[data-team]'); if (tr) setFocus(tr.dataset.team); });

  // ---------- "Watch and share": the animations sit behind one toggle; the choice is remembered on this device ----------
  (function () {
    const btn = $('#watch-toggle'), panel = $('#watch');
    if (!btn || !panel) return;
    const set = (open) => { btn.setAttribute('aria-expanded', String(open)); panel.hidden = !open; try { localStorage.setItem('tl-watch-open', open ? '1' : '0'); } catch (e) {} };
    let saved = null; try { saved = localStorage.getItem('tl-watch-open'); } catch (e) {}
    set(saved === '1');
    btn.addEventListener('click', () => { const open = btn.getAttribute('aria-expanded') !== 'true'; set(open); });
  })();

  // ---------- views: the dashboard, the race snapshot (#snapshot-17) or the accessibility statement ----------
  (function () {
    const root = document.querySelector('.tl');
    const VIEWS = { snapshot: { el: '#snapshot', head: '#snap-title', title: 'Race snapshot' }, accessibility: { el: '#accessibility', head: '#a11y-title', title: 'Accessibility statement' } };
    if (!root) return;
    const show = (name, round, fromUser) => {
      Object.entries(VIEWS).forEach(([k, v]) => { const el = $(v.el); if (el) el.hidden = k !== name; });
      root.classList.toggle('show-view', !!name);
      document.title = name ? VIEWS[name].title + ' · aston martpx F1 Fantasy' : 'aston martpx · F1 Fantasy Telemetry';
      if (name === 'snapshot' && window.TLSnapshot) TLSnapshot.render(round);
      else dash.setLink(name || 'top');
      if (fromUser) { root.scrollIntoView({ block: 'start' }); (name ? $(VIEWS[name].head) : $('#watch-toggle')).focus(); }
    };
    document.addEventListener('click', (e) => {
      const a = e.target.closest('[data-view]'); if (!a) return;
      e.preventDefault();
      const name = VIEWS[a.dataset.view] ? a.dataset.view : null;
      const r = a.dataset.round === 'selected' ? +dash.params().upto : +a.dataset.round || null;
      show(name, r, true);
    });
    const fromHash = () => {
      const m = /^#(accessibility|snapshot)(?:-(\d+))?$/.exec(location.hash);
      if (m) show(m[1], m[2] ? +m[2] : null, false); else if (root.classList.contains('show-view')) show(null, null, false);
    };
    addEventListener('hashchange', fromHash); addEventListener('popstate', fromHash);
    // the snapshot needs the data, so a linked view opens once it has loaded
    let opened = false;
    dash.onData(() => { if (!opened && dash.data('standings').status === 'ok') { opened = true; fromHash(); } });
  })();

  // ---------- sticky season bar: condenses once it pins to the top ----------
  // Pinned = the bar has stuck while the marker just above it has scrolled on past.
  // Comparing the two positions works whichever element is scrolling (the window or a
  // host container) and wherever the pinned edge sits, so it never misses a state.
  (function () {
    const bar = $('#round-controls'), sentinel = $('#bar-sentinel');
    if (!bar || !sentinel) return;
    let fullH = bar.offsetHeight, stuck = false, queued = false;
    const check = () => {
      queued = false;
      const gap = parseFloat(getComputedStyle(bar.parentElement).rowGap) || 0;
      const now = bar.getBoundingClientRect().top - sentinel.getBoundingClientRect().bottom > gap + 0.5;
      if (!now) fullH = bar.offsetHeight || fullH;
      if (now === stuck) return;
      stuck = now;
      bar.classList.toggle('is-stuck', stuck);
      // keep the space the full bar took, so the page below doesn't jump when it condenses
      bar.style.marginBottom = stuck ? Math.max(0, fullH - bar.offsetHeight) + 'px' : '';
      // keep keyboard focus clear of the pinned bar (WCAG 2.4.11): pad the scroller by the bar's height
      if (stuck) { let sc = bar.parentElement; while (sc && sc !== document.body && !/(auto|scroll)/.test(getComputedStyle(sc).overflowY)) sc = sc.parentElement; sc = sc && sc !== document.body ? sc : document.scrollingElement; sc.style.scrollPaddingTop = (bar.offsetHeight + 12) + 'px'; }
    };
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(check); } };
    document.addEventListener('scroll', queue, { capture: true, passive: true });
    // only a change of width can change the bar's full height. On phones the browser's toolbar
    // shows and hides while you scroll, firing height-only resizes; those must not reset the bar.
    let lastW = innerWidth;
    addEventListener('resize', () => {
      if (innerWidth !== lastW) { lastW = innerWidth; if (stuck) { bar.classList.remove('is-stuck'); bar.style.marginBottom = ''; stuck = false; fullH = bar.offsetHeight; } }
      queue();
    });
    if ('ResizeObserver' in window) new ResizeObserver(() => { if (!stuck) fullH = bar.offsetHeight; }).observe(bar);
    window.__tlBarCheck = queue;
    queue();
  })();

  // ---------- draw ----------
  function draw() {
    const need = ['scores', 'teams', 'calendar', 'standings', 'race_stats', 'grid', 'team_form'];
    if (!ready(need)) {
      if (failed(['scores', 'teams', 'calendar'])) ['#chart-cum', '#chart-bump', '#chart-rate', '#chart-team'].forEach((s) => failBox($(s)));
      return;
    }
    const scores = dash.data('scores').data, teams = dash.data('teams').data, cal = dash.data('calendar').data;
    const st = dash.data('standings').data, rs = dash.data('race_stats').data, grid = dash.data('grid').data, form = dash.data('team_form').data;
    const rounds = [...new Set(st.map((s) => +s.round))].sort((a, b) => a - b);
    const maxR = rounds[rounds.length - 1];
    const p = dash.params();
    let upto = +p.upto; if (!rounds.includes(upto)) upto = maxR;
    const color = Object.fromEntries(teams.map((t) => [t.team, t.color]));
    const codeOf = Object.fromEntries(teams.map((t) => [t.team, t.code]));
    const at = st.filter((s) => +s.round === upto).sort((a, b) => a.rank - b.rank);
    const leader = at[0];
    const focus = p.focus && color[p.focus] ? p.focus : null;
    const subject = focus || leader.team;
    const lab = roundLabel(cal, upto);
    const raceStat = rs.find((r) => +r.round === upto);
    document.querySelectorAll('.dash-skeleton').forEach((el) => el.classList.remove('dash-skeleton'));

    // eyebrow
    $('#eyebrow-session').textContent = 'After ' + lab.tag + ' · ' + lab.long;

    // season calendar: every round as a tile; rounds with league data pick the view
    const rb = $('#rounds');
    const hadFocus = rb.contains(document.activeElement);
    rb.replaceChildren();
    const fd = d3.utcFormat('%-d %b');
    const statBy = Object.fromEntries(rs.map((x) => [+x.round, x]));
    const pick = (r) => { stopPlay(); dash.setParams({ upto: r }); };
    cal.forEach((c) => {
      const r = +c.round, target = r, has = rounds.includes(target) && /^In league/.test(c.status);
      const st = has ? 'in' : /^Awaiting/.test(c.status) ? 'await' : 'up';
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'tl-cr ' + st + (has ? (target <= upto ? ' past' : ' future') : '');
      b.dataset.r = target;
      const sel = has && r === upto;
      if (has) { b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(sel)); b.tabIndex = sel ? 0 : -1; }
      else { b.disabled = true; }
      const s = statBy[target];
      const best = has && target <= upto && s ? codeOf[s.top_team] : null;
      b.setAttribute('aria-label', 'Round ' + r + ', ' + c.grand_prix + ', ' + fd(new Date(c.date)) + (c.sprint ? ', sprint weekend' : '') + '. ' +
        (has ? (best ? 'Race best ' + s.top_team + '.' : 'Select to see the standings after this round.') : st === 'await' ? 'Raced, league scores still to add.' : 'Upcoming.'));
      const t = document.createElement('b'); t.textContent = 'R' + r + ' ' + c.code;
      const n = document.createElement('span'); n.textContent = c.city;
      const dt = document.createElement('span'); dt.className = 'st'; dt.textContent = fd(new Date(c.date));
      if (c.sprint) {
        const sv = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); sv.setAttribute('viewBox', '0 0 12 12'); sv.setAttribute('class', 'spr-ico'); sv.setAttribute('aria-hidden', 'true');
        const pa = document.createElementNS('http://www.w3.org/2000/svg', 'path'); pa.setAttribute('d', 'M7 0 2 7h3.2L4.4 12 10 4.8H6.6Z'); pa.setAttribute('fill', 'currentColor'); sv.appendChild(pa);
        const sp = document.createElement('span'); sp.className = 'spr'; sp.title = 'Sprint weekend'; sp.appendChild(sv); b.appendChild(sp);
      }
      const ex = document.createElement('span'); ex.className = 'ex';
      ex.textContent = best ? '◆ ' + best : has ? 'in data' : st === 'await' ? 'awaiting' : 'upcoming';
      if (best) ex.style.color = '#E7D6FF';
      b.append(t, n, dt, ex);
      if (has) {
        b.addEventListener('click', () => pick(target));
        b.addEventListener('keydown', (e) => {
          if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
          e.preventDefault();
          const i = rounds.indexOf(upto), fwd = e.key === 'ArrowRight' || e.key === 'ArrowDown';
          const k = e.key === 'Home' ? 0 : e.key === 'End' ? rounds.length - 1 : Math.max(0, Math.min(rounds.length - 1, i + (fwd ? 1 : -1)));
          pick(rounds[k]);
        });
      }
      rb.appendChild(b);
    });
    if (hadFocus) { const on = rb.querySelector('[aria-checked="true"]'); if (on) on.focus(); }
    const onTile = rb.querySelector('[aria-checked="true"]');
    if (onTile && rb.scrollWidth > rb.clientWidth) rb.scrollLeft = Math.max(0, onTile.offsetLeft - rb.clientWidth / 2 + onTile.offsetWidth / 2);
    $('#bar-now').textContent = lab.tag + ' · ' + lab.long;
    if (playing) $('#season-live').textContent = 'Standings after ' + lab.tag + ', ' + lab.long + '. ' + leader.team + ' leads.';
    $('#race-recap-txt').textContent = 'Play ' + lab.tag + ' recap';
    $('#race-snap-txt').textContent = lab.tag + ' snapshot';
    const lastLab = roundLabel(cal, maxR); $('#watch-round').textContent = lastLab.tag + ' ' + lastLab.long;
    if (window.__tlBarCheck) window.__tlBarCheck();
    const awaiting = cal.filter((c) => /^Awaiting/.test(c.status));
    // the season note itself lives in the page; only the live part is written here
    $('#cal-note').textContent = awaiting.length ? ' ' + awaiting.map((c) => c.code).join(', ') + (awaiting.length === 1 ? ' still needs' : ' still need') + ' league scores.' : '';

    // focus select
    const sel = $('#focus');
    if (document.activeElement !== sel) {
      sel.replaceChildren(new Option('None — show all equally', ''), ...teams.map((t) => new Option(t.team + '  (' + t.code + ')', t.team)));
      sel.value = focus || '';
    }

    // takeaway: a short story of the round, written from the data.
    // It's told from the pack's side: the leader is only named when the lead changes hands,
    // the weekend's best score from behind the leader gets the spotlight, and the title race
    // is described from second place. That keeps it fair however long one team stays in front.
    const second = at[1];
    const tk = $('#takeaway'); tk.replaceChildren();
    // three voices: team names (with their colour mark), figures, and the narrative between them
    const add = (txt, kind, src) => {
      const s = document.createElement(kind ? 'strong' : 'span'); s.textContent = txt;
      if (kind === 'team') { s.className = 'tk-team'; s.style.setProperty('--c', color[txt] || 'var(--tl-muted)'); }
      if (kind === 'num') {
        // the figure in the dashboard's monospace, the unit in the sentence's typeface
        s.className = 'tk-num'; s.textContent = '';
        const m = /^([−\d,.]+)(.*)$/.exec(txt) || [txt, txt, ''];
        const fig = document.createElement('span'); fig.className = 'tk-fig'; fig.textContent = m[1];
        s.append(fig, m[2]);
      }
      if (src) mark(s, ...src);
      tk.appendChild(s);
    };
    const team = (name) => add(name, 'team');
    const pts = (n) => fmt(n) + (n === 1 ? ' point' : ' points');
    const ri = rounds.indexOf(upto), pr = ri > 0 ? rounds[ri - 1] : null;
    const atR = (r) => st.filter((s) => +s.round === r);
    const prevAt = pr ? Object.fromEntries(atR(pr).map((s) => [s.team, s])) : {};
    const prevLeader = pr ? atR(pr).find((s) => s.rank === 1) : null;
    const where = 'the ' + lab.long;
    const dayRows = scores.filter((x) => +x.round === upto).sort((a, b) => b.points - a.points);
    const bestChaser = dayRows.find((x) => x.team !== leader.team);
    const mover = at.filter((s) => s.change !== null && s.change >= 2).sort((a, b) => b.change - a.change || a.rank - b.rank)[0];
    const fight = at.slice(1).map((s, i) => ({ a: at[i], b: s, gap: at[i].cum - s.cum })).filter((f) => f.a.rank > 1 && f.gap <= 40).sort((x, y) => x.gap - y.gap)[0];
    const used = new Set();
    // 1. the headline: the biggest story from the field
    if (prevLeader && prevLeader.team !== leader.team) {
      team(leader.team); add(' takes the championship lead from '); team(prevLeader.team); add(' at ' + where + '. '); used.add(leader.team);
    } else if (mover) {
      team(mover.team); add(' was the big mover at ' + where + ', up ' + mover.change + ' places to P' + mover.rank + '. '); used.add(mover.team);
    } else if (bestChaser) {
      team(bestChaser.team); add(raceStat.top_team === bestChaser.team ? ' topped ' + where + ' with ' : ' led the chasing pack at ' + where + ' with ');
      add(pts(+bestChaser.points), 'num', ['scores', 'points', 'team=' + enc(bestChaser.team) + '&round=' + upto]); add('. '); used.add(bestChaser.team);
    }
    // 2. a second story: the weekend's best from behind the leader, else the tightest battle
    if (bestChaser && !used.has(bestChaser.team)) {
      add(raceStat.top_team === bestChaser.team ? 'Top score on the day: ' : 'Best of the rest on the day: '); team(bestChaser.team); add(' with ');
      add(pts(+bestChaser.points), 'num', ['scores', 'points', 'team=' + enc(bestChaser.team) + '&round=' + upto]); add('. ');
    } else if (fight) {
      add('Tightest battle: P' + fight.a.rank + ' '); team(fight.a.team); add(' and P' + fight.b.rank + ' '); team(fight.b.team); add(', '); add(pts(fight.gap), 'num'); add(' apart. ');
    }
    // 3. the title race, told from second place
    if (second) {
      const was = prevAt[second.team] && prevAt[leader.team] && prevLeader && prevLeader.team === leader.team ? prevAt[second.team].gap : null;
      if (used.has(second.team)) add('In the title race, they’re '); else { add('In the title race, '); team(second.team); add(' is '); }
      add(pts(second.gap), 'num', ['standings', 'gap', 'team=' + enc(second.team) + '&round=' + upto]);
      add(' off the top' + (was === null || was === second.gap ? '.' : second.gap < was ? ', ' + fmt(was - second.gap) + ' closer than last time.' : ', ' + fmt(second.gap - was) + ' further back than last time.'));
    }

    // tiles
    const tl = $('#t-leader-v'); tweenNum(tl, leader.cum, fmtR, undefined, { delta: true, best: raceStat.top_team === leader.team }); mark(tl, 'standings', 'cum', 'team=' + enc(leader.team) + '&round=' + upto);
    $('#tile-leader').style.setProperty('--tile-accent', color[leader.team]);
    $('#t-leader-s').replaceChildren(Object.assign(document.createElement('strong'), { textContent: leader.team }), document.createTextNode(' · points'));
    const tg = $('#t-gap-v'); tweenNum(tg, second.gap, fmtR, undefined, { delta: true }); mark(tg, 'standings', 'gap', 'team=' + enc(second.team) + '&round=' + upto);
    const prevR = rounds[rounds.indexOf(upto) - 1];
    let gapTxt = 'to ' + second.team;
    if (prevR) {
      const pa = st.filter((s) => +s.round === prevR).sort((a, b) => a.rank - b.rank);
      if (pa[1]) { const d = second.gap - pa[1].gap; gapTxt += ' · ' + signed(d) + ' vs ' + roundLabel(cal, prevR).short; }
    }
    $('#t-gap-s').textContent = gapTxt;
    $('#t-top-r').textContent = '· ' + lab.short;
    const tt = $('#t-top-v'); tweenNum(tt, raceStat.top, fmtR, undefined, { delta: true }); mark(tt, 'race_stats', 'top', 'round=' + upto);
    $('#t-top-s').replaceChildren(Object.assign(document.createElement('strong'), { textContent: raceStat.top_team }), document.createTextNode(' · single race'));
    $('#t-avg-r').textContent = '· ' + lab.short;
    const ta = $('#t-avg-v'); tweenNum(ta, raceStat.mean, fmtD, undefined, { delta: true, fmt: fmtD }); mark(ta, 'race_stats', 'mean', 'round=' + upto);
    $('#t-avg-s').textContent = fmt(raceStat.n) + ' teams scored';
    const climbers = at.filter((s) => s.change !== null).sort((a, b) => b.change - a.change || a.rank - b.rank);
    const cl = climbers[0];
    const tc = $('#t-climb-v');
    if (cl && cl.change > 0) {
      d3.select(tc).interrupt('num'); tc.__tn = null; tc.textContent = '▲ ' + cl.change; mark(tc, 'standings', 'change', 'team=' + enc(cl.team) + '&round=' + upto);
      $('#t-climb-s').replaceChildren(Object.assign(document.createElement('strong'), { textContent: cl.team }), document.createTextNode(' · P' + cl.prev_rank + ' → P' + cl.rank));
    } else {
      tc.textContent = '—'; tc.removeAttribute('data-where');
      $('#t-climb-s').textContent = upto === rounds[0] ? 'Opening round — no prior positions' : 'No position changes';
    }

    $('#h-race').textContent = 'The championship · after ' + lab.tag;

    drawCumulative(st, teams, cal, rounds, upto, focus, color);
    drawTower(at, color, focus, upto, cal, prevR);
    drawPodium(scores, rs, upto, cal, color, lab);
    drawSectors(grid, rs, rounds, upto, cal, teams, color, focus);
    drawBump(st, teams, cal, rounds, upto, focus, color);
    drawRate(at, color, focus, upto);
    drawTeam(subject, focus, scores, rs, st, form, rounds, upto, cal, color);
    drawPicks(scores, rounds, upto, cal, color, subject, focus);
  }

  // shared tooltip helpers
  function showTip(box, html, x, y) {
    if (tip.parentNode !== box) box.appendChild(tip);
    tip.replaceChildren(...html);
    tip.style.display = 'block';
    const bw = box.clientWidth, tw = tip.offsetWidth, th = tip.offsetHeight;
    let left = x + 14; if (left + tw > bw) left = x - tw - 14; if (left < 0) left = 0;
    let top = y - th / 2; top = Math.max(0, Math.min(top, box.clientHeight - th));
    tip.style.left = left + 'px'; tip.style.top = top + 'px';
  }
  function hideTip() { tip.style.display = 'none'; }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && tip.style.display === 'block') hideTip(); });
  function tipRow(c, name, val, dim) {
    const r = document.createElement('div'); r.className = 'r' + (dim ? ' dim' : '');
    const sw = document.createElement('span'); sw.className = 'sw'; sw.style.background = c;
    const n = document.createElement('span'); n.textContent = name;
    const v = document.createElement('span'); v.className = 'v'; v.textContent = val;
    r.append(sw, n, v); return r;
  }
  function tipHead(t) { const h = document.createElement('div'); h.className = 'h'; h.textContent = t; return h; }

  function axisStyle(g) { g.attr('font-size', null).attr('font-family', null); g.select('.domain').remove(); g.selectAll('line').attr('stroke', '#1C222A'); }

  function declutter(items, minGap, lo, hi) {
    items.sort((a, b) => a.y - b.y);
    for (let it = 0; it < 30; it++) {
      for (let i = 1; i < items.length; i++) { const d = items[i].y - items[i - 1].y; if (d < minGap) { const s = (minGap - d) / 2; items[i].y += s; items[i - 1].y -= s; } }
      items.forEach((d) => { d.y = Math.max(lo, Math.min(hi, d.y)); });
    }
    return items;
  }

  // ---------- motion helpers ----------
  // Charts are built once and then updated in place, so a round change eases from the
  // old state to the new one instead of redrawing. Reduced-motion users get instant updates.
  const REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const DUR = REDUCED ? 0 : 650;
  const EASE = d3.easeCubicInOut;
  const CSS_EASE = 'cubic-bezier(.65,0,.35,1)';
  const tr = (sel, dur) => sel.interrupt().transition().duration(dur === undefined ? DUR : dur).ease(EASE);
  // Numbers glide to their new value: tabular figures keep their width, and the tween is short.
  // With opt.delta, a small badge shows the change for a moment: green up, yellow down,
  // purple when a rise came from the round's best score (a fall is always yellow).
  const setText = (el, txt) => {
    if (!el.__tn || el.__tn.parentNode !== el) { [...el.childNodes].forEach((c) => { if (!(c.classList && c.classList.contains('tl-delta'))) c.remove(); }); el.__tn = document.createTextNode(''); el.prepend(el.__tn); }
    el.__tn.data = txt;
  };
  function deltaBadge(el, d, best, f) {
    if (!d || !isFinite(d)) return;
    el.querySelectorAll('.tl-delta').forEach((x) => x.remove());
    const b = document.createElement('span');
    b.className = 'tl-delta ' + (d < 0 ? 'down' : best ? 'best' : 'up');
    b.textContent = (d > 0 ? '+' : '−') + f(Math.abs(d));
    b.setAttribute('aria-hidden', 'true');
    el.appendChild(b);
    const done = () => b.remove();
    if (REDUCED) setTimeout(done, 1600); else b.addEventListener('animationend', done);
  }
  function tweenNum(el, to, f, from, opt) {
    const prev = from !== undefined ? from : el.__v;
    el.__v = to;
    if (to === null || to === undefined || !isFinite(to)) { d3.select(el).interrupt('num'); el.__tn = null; el.textContent = '—'; return; }
    if (opt && opt.delta && prev !== null && prev !== undefined && isFinite(prev) && prev !== to) deltaBadge(el, to - prev, opt.best, opt.fmt || fmtR);
    if (DUR === 0 || prev === null || prev === undefined || !isFinite(prev) || prev === to) { d3.select(el).interrupt('num'); setText(el, f(to)); return; }
    d3.select(el).interrupt('num').transition('num').duration(DUR).ease(EASE)
      .tween('text', () => { const i = d3.interpolateNumber(prev, to); return (t) => { setText(el, f(i(t))); }; })
      .on('end', () => { setText(el, f(to)); });
  }
  const fmtR = (v) => fmt(Math.round(v));
  const fmtD = (v) => fmt1(Math.round(v * 10) / 10);

  // ---------- cumulative line chart ----------
  function drawCumulative(st, teams, cal, rounds, upto, focus, color) {
    const box = $('#chart-cum');
    const W = box.clientWidth || 800;
    const key = W + '|' + rounds.join(',') + '|' + st.length + '|' + teams.map((t) => t.team).join(',');
    if (box.__key !== key) buildCumulative(box, key, W, st, teams, cal, rounds, color);
    box.__s.update(upto, focus);
  }
  function buildCumulative(box, key, W, st, teams, cal, rounds, color) {
    box.replaceChildren(); box.__key = key;
    const H = 360, narrow = W < 560, uid = 'cum' + Math.random().toString(36).slice(2, 7);
    const svg = d3.select(box).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
      .attr('aria-label', 'Line chart of cumulative points per team by round. Full values are in the timing tower and sectors table.');
    const maxY = d3.max(st, (d) => d.cum);
    const y = d3.scaleLinear([0, maxY * 1.04], [H - 30, 12]).nice();
    const probe = svg.append('text').text(fmt(y.domain()[1]));
    const tickW = probe.node().getComputedTextLength(); probe.remove();
    const endW = narrow ? 34 : 92, m = { l: tickW + 12, r: endW + 12 };
    const x = d3.scalePoint(rounds, [m.l + 8, W - m.r]);
    svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(6).tickSize(-(W - m.l - m.r)).tickFormat(fmt)).call(axisStyle);
    const step = narrow ? Math.ceil(rounds.length / 5) : 1;
    const ticks = svg.append('g').attr('transform', `translate(0,${H - 30})`).call(d3.axisBottom(x).tickSize(0).tickPadding(10).tickValues(rounds.filter((r, i) => i % step === 0 || i === rounds.length - 1)).tickFormat((r) => roundLabel(cal, r).short)).call(axisStyle).selectAll('text');
    const defs = svg.append('defs');
    const solidClip = defs.append('clipPath').attr('id', uid + 's').append('rect').attr('x', 0).attr('y', 0).attr('height', H).attr('width', 0);
    const ghostClip = defs.append('clipPath').attr('id', uid + 'g').append('rect').attr('y', 0).attr('height', H).attr('x', 0).attr('width', W);
    const dim = svg.append('rect').attr('y', 8).attr('height', H - 38).attr('fill', '#0A0C0F').attr('opacity', 0).attr('x', W).attr('width', 0);
    const marker = svg.append('line').attr('y1', 8).attr('y2', H - 30).attr('stroke', '#FF3B30').attr('stroke-dasharray', '3 3').attr('stroke-width', 1);
    const line = d3.line().x((d) => x(+d.round)).y((d) => y(d.cum));
    const series = teams.map((t) => ({ team: t.team, code: t.code, pts: st.filter((s) => s.team === t.team).sort((a, b) => a.round - b.round) })).filter((s) => s.pts.length);
    const g = svg.append('g');
    series.forEach((s) => {
      s.g = g.append('g').style('cursor', 'pointer');
      s.ghost = s.g.append('path').attr('d', line(s.pts)).attr('fill', 'none').attr('stroke', color[s.team]).attr('stroke-width', 1.5).attr('stroke-opacity', 0.22).attr('stroke-dasharray', '2 4').attr('clip-path', `url(#${uid}g)`);
      s.solid = s.g.append('path').attr('d', line(s.pts)).attr('fill', 'none').attr('stroke', color[s.team]).attr('stroke-width', 2).attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round').attr('clip-path', `url(#${uid}s)`);
      s.dots = s.g.append('g').attr('clip-path', `url(#${uid}s)`).selectAll('circle').data(s.pts).join('circle').attr('cx', (d) => x(+d.round)).attr('cy', (d) => y(d.cum)).attr('r', 2.2).attr('fill', color[s.team]);
      if (+s.pts[0].round > rounds[0]) s.g.append('text').attr('clip-path', `url(#${uid}s)`).attr('x', x(+s.pts[0].round)).attr('y', y(s.pts[0].cum) + 16).attr('text-anchor', 'middle').attr('fill', color[s.team]).text('IN');
      s.g.on('click', () => setFocus(s.team === box.__s.focus ? null : s.team));
    });
    const lg = svg.append('g');
    series.forEach((s) => {
      s.lab = lg.append('g').attr('opacity', 0).style('cursor', 'pointer').on('click', () => setFocus(s.team === box.__s.focus ? null : s.team));
      s.lead = s.lab.append('line').attr('x1', 3).attr('x2', 10).attr('stroke', color[s.team]).attr('opacity', 0.7);
      const t = s.lab.append('text').attr('x', 13).attr('dy', '0.35em');
      t.append('tspan').attr('fill', color[s.team]).attr('font-weight', 700).text(s.code);
      s.val = narrow ? null : t.append('tspan').attr('fill', '#F2F4F7').attr('dx', 6).node();
    });
    const hl = svg.append('line').attr('y1', 8).attr('y2', H - 30).attr('stroke', '#A3ADBA').attr('stroke-width', 1).attr('opacity', 0);
    const near = (mx) => rounds.reduce((a, b) => (Math.abs(x(b) - mx) < Math.abs(x(a) - mx) ? b : a));
    svg.append('rect').attr('x', m.l).attr('y', 0).attr('width', W - m.l - m.r).attr('height', H - 30).attr('fill', 'transparent')
      .on('mousemove', (ev) => {
        const [mx, my] = d3.pointer(ev), r = near(mx), f = box.__s.focus;
        hl.attr('x1', x(r)).attr('x2', x(r)).attr('opacity', 0.6);
        const rows = st.filter((s) => +s.round === r).sort((a, b) => a.rank - b.rank), sc = box.clientWidth / W;
        showTip(box, [tipHead(roundLabel(cal, r).tag + ' · ' + roundLabel(cal, r).long), ...rows.map((d) => tipRow(color[d.team], 'P' + d.rank + ' ' + d.code, fmt(d.cum), f && d.team !== f))], x(r) * sc, my * sc);
      })
      .on('mouseleave', () => { hl.attr('opacity', 0); hideTip(); })
      .on('click', (ev) => {
        const [mx, my] = d3.pointer(ev), r = near(mx), rows = st.filter((s) => +s.round === r), f = box.__s.focus;
        const n = rows.reduce((a, b) => (Math.abs(y(b.cum) - my) < Math.abs(y(a.cum) - my) ? b : a));
        if (Math.abs(y(n.cum) - my) < 14) setFocus(n.team === f ? null : n.team);
      });
    box.__s = {
      upto: null, focus: null,
      update(upto, focus) {
        const first = this.upto === null, d = first ? 0 : DUR, xu = x(upto), last = upto === rounds[rounds.length - 1];
        tr(solidClip, d).attr('width', xu + 5);
        tr(ghostClip, d).attr('x', xu).attr('width', Math.max(0, W - xu));
        tr(marker, d).attr('x1', xu).attr('x2', xu);
        tr(dim, d).attr('x', xu).attr('width', Math.max(0, W - m.r - xu + 4)).attr('opacity', last ? 0 : 0.35);
        ticks.attr('fill', (r) => (r === upto ? '#F2F4F7' : '#A3ADBA')).attr('font-weight', (r) => (r === upto ? 700 : 400));
        const emph = (team) => (!focus ? 1 : team === focus ? 1 : 0.18);
        series.forEach((s) => {
          tr(s.g, d).attr('opacity', emph(s.team));
          tr(s.solid, d).attr('stroke-width', s.team === focus ? 3.5 : 2);
          tr(s.dots, d).attr('r', s.team === focus ? 3.5 : 2.2);
        });
        const ends = series.map((s) => { const p = s.pts.find((q) => +q.round === upto); return p ? { s, v: p.cum, y: y(p.cum), y0: y(p.cum) } : null; }).filter(Boolean);
        declutter(ends, 13, 10, H - 34);
        const shown = new Set(ends.map((e) => e.s));
        series.forEach((s) => { if (!shown.has(s)) tr(s.lab, d).attr('opacity', 0); });
        ends.forEach((e) => {
          const s = e.s;
          if (first || +s.lab.attr('opacity') === 0) s.lab.attr('transform', `translate(${xu},${e.y})`);
          tr(s.lab, d).attr('transform', `translate(${xu},${e.y})`).attr('opacity', emph(s.team));
          tr(s.lead, d).attr('y1', e.y0 - e.y).attr('y2', 0);
          if (s.val) tweenNum(s.val, e.v, fmtR, first ? e.v : undefined);
        });
        this.upto = upto; this.focus = focus;
      },
    };
  }

  // ---------- timing tower ----------
  function drawTower(at, color, focus, upto, cal, prevR) {
    const lab = roundLabel(cal, upto);
    $('#tower-note').textContent = 'Positions after ' + lab.long + '. Gap is to the leader; Race is points scored that round.';
    const k = towerSort.k, dir = towerSort.dir;
    const rows = [...at].sort((a, b) => {
      const va = a[k], vb = b[k];
      if (va === null) return 1; if (vb === null) return -1;
      return (typeof va === 'string' ? va.localeCompare(vb) : va - vb) * dir;
    });
    document.querySelectorAll('#tower th[data-k]').forEach((th) => th.setAttribute('aria-sort', th.dataset.k === k ? (dir === 1 ? 'ascending' : 'descending') : 'none'));
    const tb = $('#tower tbody');
    const tkey = upto + '|' + k + '|' + dir + '|' + focus + '|' + rows.map((r) => r.team + r.cum).join(',');
    if (tb.__key === tkey) return;
    tb.__key = tkey;
    // FLIP: remember where each team's row was, rebuild, then slide rows from old to new place
    const before = {}, prevVals = tb.__vals || {};
    tb.querySelectorAll('tr[data-team]').forEach((r) => { before[r.dataset.team] = r.getBoundingClientRect().top; });
    tb.replaceChildren();
    const vals = {};
    const bestRace = d3.max(at, (x) => x.race_pts);
    rows.forEach((d) => {
      const tr0 = document.createElement('tr');
      tr0.dataset.key = enc(d.team).replace(/,/g, '%2C') + ',' + d.round; tr0.dataset.team = d.team;
      if (d.team === focus) tr0.classList.add('is-focus');
      const td = (txt, cls) => { const c = document.createElement('td'); if (cls) c.className = cls; c.textContent = txt; tr0.appendChild(c); return c; };
      td('P' + d.rank, 'pos');
      const t = td('', 'l team'); const chip = document.createElement('span'); chip.className = 'chip';
      const i = document.createElement('i'); i.style.background = color[d.team];
      const nm = document.createElement('span'); nm.textContent = d.team;
      const cd = document.createElement('span'); cd.className = 'code'; cd.textContent = d.code;
      chip.append(i, nm, cd); t.appendChild(chip);
      const p = prevVals[d.team] || {};
      const cumTd = td(''); tweenNum(cumTd, d.cum, fmtR, p.cum, { delta: true, best: d.race_pts !== null && d.race_pts === bestRace });
      const gapTd = td(''); if (d.gap === 0) gapTd.textContent = 'Leader'; else tweenNum(gapTd, d.gap, (v) => '−' + fmtR(v), p.gap || undefined);
      td(d.race_pts === null ? '—' : fmt(d.race_pts));
      const c = td(d.change === null ? (prevR ? 'new' : '—') : d.change > 0 ? '▲' + d.change : d.change < 0 ? '▼' + Math.abs(d.change) : '•', d.change > 0 ? 'up' : d.change < 0 ? 'down' : 'flat');
      c.setAttribute('aria-label', d.change === null ? 'no previous position' : d.change > 0 ? 'up ' + d.change : d.change < 0 ? 'down ' + Math.abs(d.change) : 'no change');
      tb.appendChild(tr0);
      vals[d.team] = { cum: d.cum, gap: d.gap };
    });
    tb.__vals = vals;
    if (DUR && tb.animate !== undefined) tb.querySelectorAll('tr[data-team]').forEach((r) => {
      const old = before[r.dataset.team];
      if (old === undefined) { r.animate([{ opacity: 0 }, { opacity: 1 }], { duration: DUR, easing: CSS_EASE }); return; }
      const dy = old - r.getBoundingClientRect().top;
      if (Math.abs(dy) > 0.5) r.animate([{ transform: `translateY(${dy}px)` }, { transform: 'translateY(0)' }], { duration: DUR, easing: CSS_EASE });
    });
  }

  // ---------- podium ----------
  function drawPodium(scores, rs, upto, cal, color, lab) {
    const c = cal.find((x) => +x.round === upto);
    $('#race-title').textContent = 'Race podium · ' + lab.short;
    $('#race-sub').textContent = 'Top three league scores at the ' + lab.long + (c ? ', ' + c.circuit : '') + '.';
    const top = scores.filter((s) => +s.round === upto).sort((a, b) => b.points - a.points).slice(0, 3);
    const pod = $('#podium');
    if (!pod.__steps) {
      pod.replaceChildren(); pod.__steps = {};
      [1, 0, 2].forEach((i) => {
        const s = document.createElement('div'); s.className = 'tl-step p' + (i + 1);
        const who = document.createElement('div'); who.className = 'who';
        const pts = document.createElement('div'); pts.className = 'pts';
        const blk = document.createElement('div'); blk.className = 'blk'; const sr = document.createElement('span'); sr.className = 'sr'; sr.textContent = 'Position '; const nb = document.createElement('span'); nb.setAttribute('aria-hidden', 'true'); nb.textContent = String(i + 1); const sn = document.createElement('span'); sn.className = 'sr'; sn.textContent = String(i + 1); blk.append(sr, sn, nb);
        s.append(who, pts, blk); pod.appendChild(s); pod.__steps[i] = { s, who, pts, blk };
      });
    }
    const best = top.length ? +top[0].points : 1;
    [0, 1, 2].forEach((i) => {
      const e = pod.__steps[i], d = top[i];
      if (!d) { e.s.style.visibility = 'hidden'; return; }
      e.s.style.visibility = '';
      if (e.who.textContent !== d.team) {
        if (e.who.textContent && DUR && e.who.animate) e.who.animate([{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: DUR, easing: CSS_EASE });
        e.who.textContent = d.team;
      }
      tweenNum(e.pts, +d.points, fmtR); mark(e.pts, 'scores', 'points', 'team=' + enc(d.team) + '&round=' + upto);
      // step height follows the score relative to the race best; colour fades to the new team
      const h = 44 + 116 * Math.max(0, +d.points) / Math.max(1, best);
      e.blk.style.height = Math.round(h) + 'px';
      const col = d3.color(color[d.team]);
      e.blk.style.borderTopColor = color[d.team];
      e.blk.style.backgroundColor = col ? col.copy({ opacity: 0.16 }).formatRgb() : '';
    });
    const r = rs.find((x) => +x.round === upto);
    const set = (id, f, v, fm) => { const el = $(id); tweenNum(el, v, fm); mark(el, 'race_stats', f, 'round=' + upto); };
    set('#rm-median', 'median', r.median, fmtD); set('#rm-margin', 'margin', r.margin, fmtR); set('#rm-spread', 'spread', r.spread, fmtR);
    set('#rm-beat', 'beat_median', r.beat_median, fmtR); set('#rm-low', 'low', r.low, fmtR);
    $('#rm-low-s').textContent = r.low_team;
    $('#rm-margin-s').textContent = r.second_team ? 'clear of ' + r.second_team : '—';
    $('#rm-beat-s').textContent = 'of ' + r.n + ' teams';
  }

  // ---------- sectors ----------
  function drawSectors(grid, rs, rounds, upto, cal, teams, color, focus) {
    const tbl = $('#sectors'), head = $('#sectors-head'), tb = $('#sectors tbody');
    const statBy = Object.fromEntries(rs.map((r) => [r.round, r]));
    const key = rounds.join(',') + '|' + teams.map((t) => t.team).join(',') + '|' + grid.length + '|' + rs.map((r) => r.top).join(',');
    if (tbl.__key !== key) {
      tbl.__key = key;
      head.replaceChildren();
      const mk = (txt, field, cls) => { const th = document.createElement('th'); th.scope = 'col'; if (cls) th.className = cls; if (field) th.setAttribute('data-field', field); const sp = document.createElement('span'); sp.className = 'plain'; sp.textContent = txt; th.appendChild(sp); head.appendChild(th); return th; };
      mk('Team', 'team', 'l');
      rounds.forEach((r) => { const th = mk(roundLabel(cal, r).short, 'r' + r); th.title = roundLabel(cal, r).long; th.dataset.r = r; });
      mk('Purple', null, null).setAttribute('data-source', 'race_stats');
      tb.replaceChildren();
      const rows = [...grid].sort((a, b) => teams.findIndex((t) => t.team === a.team) - teams.findIndex((t) => t.team === b.team));
      rows.forEach((row) => {
        const tr0 = document.createElement('tr'); tr0.dataset.key = enc(row.team).replace(/,/g, '%2C'); tr0.dataset.team = row.team;
        const t = document.createElement('th'); t.scope = 'row'; t.className = 'l team';
        const chip = document.createElement('span'); chip.className = 'chip'; const i = document.createElement('i'); i.style.background = color[row.team];
        const nm = document.createElement('span'); nm.textContent = row.team; chip.append(i, nm); t.appendChild(chip); tr0.appendChild(t);
        rounds.forEach((r) => {
          const v = row['r' + r]; const td = document.createElement('td'); td.className = 'cell'; td.dataset.r = r;
          if (v === undefined || v === null) { td.textContent = '—'; td.classList.add('s-none'); td.setAttribute('aria-label', 'not entered'); }
          else { td.__v = v; const n = document.createElement('span'); n.className = 'n'; const m = document.createElement('span'); m.className = 'mk'; m.setAttribute('aria-hidden', 'true'); td.append(n, m); }
          tr0.appendChild(td);
        });
        const pc = document.createElement('td'); pc.className = 'purple-n'; tr0.appendChild(pc);
        tb.appendChild(tr0);
      });
    }
    // each score against that round's median: ▲ at or above, ▼ below, ◆ the race best
    tb.querySelectorAll('tr[data-team]').forEach((row) => {
      const team = row.dataset.team;
      row.querySelectorAll('td.cell').forEach((td) => {
        const r = +td.dataset.r, v = td.__v;
        td.classList.toggle('future', r > upto);
        if (v === undefined) return;
        const s = statBy[r], best = v === s.top, up = v >= s.median;
        td.classList.toggle('s-purple', best); td.classList.toggle('s-green', !best && up); td.classList.toggle('s-yellow', !best && !up);
        td.firstChild.textContent = (best ? '◆ ' : '') + fmt(v);
        td.lastChild.textContent = up ? '▲' : '▼';
        td.lastChild.className = 'mk ' + (up ? 'mk-up' : 'mk-down');
        td.setAttribute('aria-label', fmt(v) + (best ? ', race best' : '') + (up ? ', at or above race median' : ', below race median'));
      });
      row.classList.toggle('is-focus', team === focus);
      const n = rounds.filter((r) => r <= upto && statBy[r].top_team === team).length;
      row.querySelector('.purple-n').textContent = n ? '◆ ' + n : '—';
    });
    head.querySelectorAll('th[data-r]').forEach((th) => th.classList.toggle('cur', +th.dataset.r === upto));
  }

  // ---------- bump chart ----------
  function drawBump(st, teams, cal, rounds, upto, focus, color) {
    const box = $('#chart-bump');
    const W = box.clientWidth || 500;
    const key = W + '|' + rounds.join(',') + '|' + st.length;
    if (box.__key !== key) {
      box.replaceChildren(); box.__key = key;
      const H = 300, narrow = W < 480, uid = 'bump' + Math.random().toString(36).slice(2, 7);
      const n = d3.max(st, (d) => d.rank), m = { l: 34, r: 46, t: 10, b: 28 };
      const x = d3.scalePoint(rounds, [m.l, W - m.r]), y = d3.scaleLinear([1, n], [m.t + 6, H - m.b - 6]);
      const svg = d3.select(box).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Bump chart of league position per team after each round, up to the selected round.');
      svg.append('g').selectAll('text').data(d3.range(1, n + 1)).join('text').attr('x', 4).attr('y', (d) => y(d)).attr('dy', '.35em').text((d) => 'P' + d);
      svg.append('g').selectAll('line').data(d3.range(1, n + 1)).join('line').attr('x1', m.l - 6).attr('x2', W - m.r).attr('y1', (d) => y(d)).attr('y2', (d) => y(d)).attr('stroke', '#1C222A');
      const step = narrow ? 2 : 1;
      const ticks = svg.append('g').attr('transform', `translate(0,${H - m.b + 8})`).call(d3.axisBottom(x).tickSize(0).tickValues(rounds.filter((r, i) => i % step === 0)).tickFormat((r) => roundLabel(cal, r).short)).call(axisStyle).selectAll('text');
      const clip = svg.append('defs').append('clipPath').attr('id', uid).append('rect').attr('x', 0).attr('y', 0).attr('height', H).attr('width', 0);
      const line = d3.line().x((d) => x(+d.round)).y((d) => y(d.rank)).curve(d3.curveMonotoneX);
      const series = teams.map((t) => ({ team: t.team, code: t.code, pts: st.filter((s) => s.team === t.team).sort((a, b) => a.round - b.round) })).filter((s) => s.pts.length);
      series.forEach((s) => {
        s.g = svg.append('g').style('cursor', 'pointer').on('click', () => setFocus(s.team === box.__s.focus ? null : s.team));
        const c = s.g.append('g').attr('clip-path', `url(#${uid})`);
        s.path = c.append('path').attr('d', line(s.pts)).attr('fill', 'none').attr('stroke', color[s.team]).attr('stroke-width', 2.5).attr('stroke-linecap', 'round');
        s.dots = c.selectAll('circle').data(s.pts).join('circle').attr('cx', (d) => x(+d.round)).attr('cy', (d) => y(d.rank)).attr('r', 3).attr('fill', '#11151A').attr('stroke', color[s.team]).attr('stroke-width', 2);
        s.lab = s.g.append('text').attr('dy', '.35em').attr('fill', color[s.team]).attr('font-weight', 700).attr('opacity', 0).text(s.code);
      });
      box.__s = {
        upto: null, focus: null,
        update(upto, focus) {
          const first = this.upto === null, d = first ? 0 : DUR, xu = x(upto);
          tr(clip, d).attr('width', xu + 6);
          ticks.attr('fill', (r) => (r === upto ? '#F2F4F7' : r > upto ? '#6E7884' : '#A3ADBA'));
          const emph = (team) => (!focus ? 0.95 : team === focus ? 1 : 0.15);
          series.forEach((s) => {
            tr(s.g, d).attr('opacity', emph(s.team));
            tr(s.path, d).attr('stroke-width', s.team === focus ? 4 : 2.5);
            const p = s.pts.find((q) => +q.round === upto);
            if (p) {
              if (first || +s.lab.attr('opacity') === 0) s.lab.attr('x', xu + 8).attr('y', y(p.rank));
              tr(s.lab, d).attr('x', xu + 8).attr('y', y(p.rank)).attr('opacity', 1);
            } else tr(s.lab, d).attr('opacity', 0);
          });
          this.upto = upto; this.focus = focus;
        },
      };
    }
    box.__s.update(upto, focus);
  }

  // ---------- points per race ----------
  function drawRate(at, color, focus, upto) {
    const box = $('#chart-rate');
    const W = box.clientWidth || 500;
    const all = dash.data('teams').data, bh = 20, gap = 6, H = all.length * (bh + gap) + 10;
    const key = W + '|' + all.map((t) => t.team).join(',');
    if (box.__key !== key) {
      box.replaceChildren(); box.__key = key; box.style.minHeight = H + 'px';
      const svg = d3.select(box).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Bar chart of average points per race entered, by team.');
      const probe = svg.append('text').text('Ferrar-we there yet?'); const lw = Math.min(probe.node().getComputedTextLength() + 10, W * 0.42); probe.remove();
      const useCode = W < 420, m = { l: useCode ? 44 : lw, r: 86 };
      const rows = {};
      all.forEach((t) => {
        const g = svg.append('g').style('cursor', 'pointer').attr('opacity', 0).on('click', () => setFocus(t.team === box.__s.focus ? null : t.team));
        g.append('text').attr('x', m.l - 8).attr('y', bh / 2).attr('dy', '.35em').attr('text-anchor', 'end').attr('fill', '#F2F4F7').style('font-family', 'var(--font-anthropic-sans)').style('font-size', '12px').text(useCode ? t.code : t.team);
        const bar = g.append('rect').attr('x', m.l).attr('y', 0).attr('height', bh).attr('width', 2).attr('rx', 4).attr('fill', color[t.team]).attr('opacity', 0.9);
        const val = g.append('text').attr('y', bh / 2).attr('dy', '.35em').style('fill', '#0A0C0F').attr('font-weight', 700).attr('text-anchor', 'end').attr('x', m.l + 40);
        const races = g.append('text').attr('x', W - 4).attr('y', bh / 2).attr('dy', '.35em').attr('text-anchor', 'end').attr('fill', '#6E7884');
        rows[t.team] = { g, bar, val, races };
      });
      box.__s = { rows, m, W, focus: null, first: true };
    }
    const s = box.__s, d = s.first ? 0 : DUR;
    const sorted = [...at].sort((a, b) => b.avg - a.avg);
    const x = d3.scaleLinear([0, d3.max(sorted, (r) => r.avg) || 1], [s.m.l, W - s.m.r]);
    const seen = new Set();
    sorted.forEach((r, i) => {
      const e = s.rows[r.team]; if (!e) return; seen.add(r.team);
      const yy = i * (bh + gap) + 4, o = !focus ? 1 : r.team === focus ? 1 : 0.35;
      if (+e.g.attr('opacity') === 0) e.g.attr('transform', `translate(0,${yy})`);
      tr(e.g, d).attr('transform', `translate(0,${yy})`).attr('opacity', o);
      tr(e.bar, d).attr('width', Math.max(2, x(r.avg) - s.m.l));
      tr(e.val, d).attr('x', Math.max(s.m.l + 40, x(r.avg) - 6));
      tweenNum(e.val.node(), r.avg, fmtD, s.first ? r.avg : undefined);
      e.races.text(r.races + (r.races === 1 ? ' race' : ' races'));
    });
    Object.entries(s.rows).forEach(([team, e]) => { if (!seen.has(team)) tr(e.g, d).attr('opacity', 0); });
    s.focus = focus; s.first = false;
  }

  // ---------- team telemetry ----------
  function drawTeam(team, focus, scores, rs, st, form, rounds, upto, cal, color) {
    const s = st.find((d) => d.team === team && +d.round === upto);
    const f = form.find((d) => d.team === team && +d.upto === upto);
    $('#team-title').textContent = 'Team telemetry · ' + team;
    $('#team-sub').textContent = (focus ? '' : 'Showing the leader — choose a focus team to switch. ') + 'Race scores up to ' + roundLabel(cal, upto).short + ' against the field median.';
    $('#card-team').style.borderTop = '3px solid ' + color[team];
    const w = 'team=' + enc(team) + '&round=' + upto, wf = 'team=' + enc(team) + '&upto=' + upto;
    const box = $('#chart-team');
    const sameTeam = box.__team === team;
    const set = (id, src, fld, where, v, fm, dl) => { const el = $(id); tweenNum(el, v, fm, sameTeam ? undefined : v, dl ? { delta: true, fmt: fm === fmtD ? fmtD : fmtR } : undefined); mark(el, src, fld, where); };
    if (s) {
      const el = $('#tm-rank'); el.textContent = 'P' + s.rank; mark(el, 'standings', 'rank', w); $('#tm-rank-s').textContent = fmt(s.cum) + ' pts total';
      set('#tm-avg', 'standings', 'avg', w, s.avg, fmtD, true); $('#tm-races').textContent = s.races + ' races entered';
    } else { $('#tm-rank').textContent = '—'; $('#tm-rank-s').textContent = 'Not yet entered'; $('#tm-avg').textContent = '—'; $('#tm-avg').__v = null; $('#tm-races').textContent = '—'; }
    if (f) {
      set('#tm-best', 'team_form', 'best', wf, f.best, fmtR); $('#tm-best-s').textContent = roundLabel(cal, f.best_round).long;
      set('#tm-worst', 'team_form', 'worst', wf, f.worst, fmtR); $('#tm-worst-s').textContent = roundLabel(cal, f.worst_round).long;
      set('#tm-form', 'team_form', 'last3', wf, f.last3, fmtD);
      set('#tm-sd', 'team_form', 'sd', wf, f.sd, (v) => '±' + fmtR(v));
    } else { ['#tm-best', '#tm-worst', '#tm-form', '#tm-sd'].forEach((id) => { $(id).textContent = '—'; $(id).__v = null; }); $('#tm-best-s').textContent = '—'; $('#tm-worst-s').textContent = '—'; }

    const W = box.clientWidth || 800, H = 260, m = { l: 44, r: 12, t: 16, b: 28 };
    const rr = rounds;
    const key = W + '|' + team + '|' + rr.join(',');
    const statBy = Object.fromEntries(rs.map((r) => [r.round, r]));
    if (box.__key !== key) {
      box.replaceChildren(); box.__key = key; box.__team = team;
      const x = d3.scaleBand(rr, [m.l, W - m.r]).padding(0.28);
      const y = d3.scaleLinear([Math.min(0, d3.min(scores, (d) => +d.points)), d3.max(rs, (r) => r.top)], [H - m.b, m.t]).nice();
      const svg = d3.select(box).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Bar chart of ' + team + ' points per round with the field median marked.');
      svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(W - m.l - m.r)).tickFormat(fmt)).call(axisStyle);
      const ticks = svg.append('g').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).tickSize(0).tickPadding(8).tickFormat((r) => roundLabel(cal, r).short)).call(axisStyle).selectAll('text');
      const my = scores.filter((d) => d.team === team), items = [];
      rr.forEach((r) => {
        const d = my.find((q) => +q.round === r), xm = x(r), bw = x.bandwidth(), it = { r };
        if (d) {
          const v = +d.points, best = v === statBy[r].top;
          it.bar = svg.append('rect').attr('x', xm).attr('width', bw).attr('y', y(0)).attr('height', 0).attr('rx', 4).attr('fill', best ? '#B57BFF' : color[team]).attr('opacity', 0.18)
            .on('mousemove', (ev) => { const [px, py] = d3.pointer(ev, box); showTip(box, [tipHead(roundLabel(cal, r).long), tipRow(color[team], team, fmt(v)), tipRow('#A3ADBA', 'Field median', fmt1(statBy[r].median)), tipRow('#B57BFF', 'Race best', fmt(statBy[r].top))], px, py); })
            .on('mouseleave', hideTip);
          it.y0 = Math.min(y(v), y(0)); it.h = Math.max(1, Math.abs(y(v) - y(0)));
          it.lab = svg.append('text').attr('x', xm + bw / 2).attr('y', y(Math.max(v, 0)) - 5).attr('text-anchor', 'middle').attr('fill', '#F2F4F7').attr('opacity', 0).text(bw > 26 ? fmt(v) : '');
        } else {
          svg.append('rect').attr('x', xm).attr('width', bw).attr('y', m.t).attr('height', H - m.b - m.t).attr('rx', 4).attr('fill', 'none').attr('stroke', '#242B34').attr('stroke-dasharray', '3 3');
        }
        it.med = svg.append('line').attr('x1', xm - 3).attr('x2', xm + bw + 3).attr('y1', y(statBy[r].median)).attr('y2', y(statBy[r].median)).attr('stroke', '#F2F4F7').attr('stroke-width', 2).attr('opacity', 0.2);
        items.push(it);
      });
      svg.append('text').attr('x', W - m.r).attr('y', 10).attr('text-anchor', 'end').text('— field median   ◼ purple = race best');
      box.__s = { items, ticks, first: true };
    }
    const S = box.__s, d = DUR;
    S.ticks.attr('fill', (r) => (r === upto ? '#F2F4F7' : r > upto ? '#6E7884' : '#A3ADBA'));
    S.items.forEach((it) => {
      const future = it.r > upto;
      if (it.bar) {
        // bars grow in when the team is first shown, then just fade as the season moves
        tr(it.bar, S.first ? (REDUCED ? 0 : 500) : d).attr('y', it.y0).attr('height', it.h).attr('opacity', future ? 0.18 : 0.92);
        tr(it.lab, d).attr('opacity', future ? 0 : 1);
      }
      tr(it.med, d).attr('opacity', future ? 0.2 : 0.85);
    });
    S.first = false;
  }

  // ---------- chips and picks (optional fields on each score entry) ----------
  function drawPicks(scores, rounds, upto, cal, color, subject, focus) {
    const has = (s, k) => Array.isArray(s[k]) && s[k].length;
    const anyPicks = scores.some((s) => has(s, 'drivers') || has(s, 'constructors'));
    const anyChips = scores.some((s) => s.chip);
    const anyCap = scores.some((s) => typeof s.cost_cap_left === 'number');
    const empty = !anyPicks && !anyChips && !anyCap;
    $('#picks-empty').hidden = !empty; $('#picks-body').hidden = empty;
    const lab = roundLabel(cal, upto);
    $('#picks-sub').textContent = empty ? 'Optional fields to add next season. Record any of them and this section fills in by itself.' : 'Line-ups for ' + lab.long + ', and every chip played up to then.';
    // a planned section until data arrives: dashed yellow 'Track from 2027'; then it becomes a normal card
    $('#picks-title').textContent = empty ? 'Track from 2027 · Chips and picks' : 'Chips and picks';
    $('#card-picks').classList.toggle('tl-future', empty);
    if (empty) return;
    const rows = scores.filter((s) => +s.round === upto);
    const me = rows.find((s) => s.team === subject);
    $('#pk-team').textContent = subject + (focus ? '' : ' (leader)');
    const lu = $('#pk-lineup'); lu.replaceChildren();
    const pills = (list, cls) => { const w = document.createElement('div'); w.className = 'tl-pills'; list.forEach((c) => { const p = document.createElement('span'); p.className = 'tl-pill' + (cls ? ' ' + cls : ''); p.textContent = c; w.appendChild(p); }); return w; };
    if (me && (has(me, 'drivers') || has(me, 'constructors') || me.chip || typeof me.cost_cap_left === 'number')) {
      if (has(me, 'drivers')) lu.appendChild(pills(me.drivers));
      if (has(me, 'constructors')) lu.appendChild(pills(me.constructors, 'con'));
      if (me.chip) lu.appendChild(pills(['Chip · ' + me.chip], 'chip'));
      if (typeof me.cost_cap_left === 'number') { const k = document.createElement('p'); k.className = 'tl-kv'; k.append('Cost cap left: '); const b = document.createElement('b'); b.textContent = fmt1(me.cost_cap_left) + 'm'; k.appendChild(b); lu.appendChild(k); }
    } else { const p = document.createElement('p'); p.className = 'tl-kv'; p.textContent = 'No line-up recorded for this team in this round.'; lu.appendChild(p); }
    const bars = (el, key) => {
      el.replaceChildren();
      const withK = rows.filter((s) => has(s, key));
      if (!withK.length) { const p = document.createElement('p'); p.className = 'tl-kv'; p.textContent = 'No ' + key + ' recorded for this round yet.'; el.appendChild(p); return; }
      const count = {}; withK.forEach((s) => s[key].forEach((c) => { count[c] = (count[c] || 0) + 1; }));
      const mine = new Set(me && has(me, key) ? me[key] : []);
      Object.entries(count).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).forEach(([c, n]) => {
        const r = document.createElement('div'); r.className = 'tl-bar' + (mine.has(c) ? ' mine' : ''); r.style.setProperty('--mine', color[subject]);
        const a = document.createElement('span'); a.className = 'c'; a.textContent = c;
        const t = document.createElement('span'); t.className = 't'; const i = document.createElement('i'); i.style.width = (n / withK.length * 100) + '%'; t.appendChild(i);
        const m = document.createElement('span'); m.className = 'n'; m.textContent = n + ' of ' + withK.length;
        r.setAttribute('aria-label', c + ': picked by ' + n + ' of ' + withK.length + ' teams' + (mine.has(c) ? ', in ' + subject + '’s line-up' : ''));
        r.append(a, t, m); el.appendChild(r);
      });
    };
    bars($('#pk-drivers'), 'drivers'); bars($('#pk-cons'), 'constructors');
    const tb = $('#pk-chips tbody'); tb.replaceChildren();
    const played = scores.filter((s) => s.chip && +s.round <= upto).sort((a, b) => b.round - a.round || b.points - a.points);
    if (!played.length) { const tr = document.createElement('tr'); const td = document.createElement('td'); td.colSpan = 5; td.className = 'l'; td.textContent = 'No chips recorded up to this round.'; tr.appendChild(td); tb.appendChild(tr); }
    played.forEach((s) => {
      const base = scores.filter((x) => x.team === s.team && !x.chip && !/combined/i.test(x.note || ''));
      const avg = base.length ? base.reduce((a, x) => a + +x.points, 0) / base.length : null;
      const tr = document.createElement('tr'); tr.dataset.team = s.team; if (s.team === focus) tr.classList.add('is-focus');
      const td = (txt, cls) => { const c = document.createElement('td'); if (cls) c.className = cls; c.textContent = txt; tr.appendChild(c); return c; };
      td(roundLabel(cal, +s.round).short, 'l');
      const t = td('', 'l team'); const chip = document.createElement('span'); chip.className = 'chip'; const i = document.createElement('i'); i.style.background = color[s.team]; const nm = document.createElement('span'); nm.textContent = s.team; chip.append(i, nm); t.appendChild(chip);
      td(s.chip, 'l');
      td(fmt(s.points));
      const d = avg === null ? null : s.points - avg;
      const c = td(d === null ? '—' : (d >= 0 ? '+' : '−') + fmt1(Math.abs(d)), d === null ? 'flat' : d >= 0 ? 'up' : 'down');
      if (d !== null) c.setAttribute('aria-label', (d >= 0 ? 'above' : 'below') + ' their average by ' + fmt1(Math.abs(d)));
      tb.appendChild(tr);
    });
    tb.onclick = (e) => { const tr = e.target.closest('tr[data-team]'); if (tr) setFocus(tr.dataset.team); };
  }
  // ---------- calendar ----------
  dash.onData(draw);
})();
