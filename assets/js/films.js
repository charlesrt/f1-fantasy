/*
  films.js — one player for the three animations: the grid race, the world tour
  and the race recap. Scenes live in assets/films/*.js and register through
  FILMKIT; this file gives them their toolkit, builds their data from the league
  files, and runs the player (play, pause, seek, chapters, sound, share links).

  Open with any [data-film] or [data-recap] control, or a link:
  #film-grid, #film-tour, #recap-17
*/
(function () {
  const REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const MONO = '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace';
  const SANS = 'var(--font-anthropic-sans, system-ui, sans-serif)';
  const nf = new Intl.NumberFormat('en-GB');

  // ---------- the toolkit the scenes use ----------
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const seg = (t, a, b) => clamp01((t - a) / (b - a));
  const lerp = (a, b, k) => a + (b - a) * k;
  const eo = (x) => 1 - Math.pow(1 - clamp01(x), 3);
  const ei = (x) => Math.pow(clamp01(x), 3);
  const eio = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  const eob = (x, s) => { x = clamp01(x); const c = s === undefined ? 1.70158 : s; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const h = (html) => { const tpl = document.createElement('template'); tpl.innerHTML = html.trim(); return tpl.content.firstElementChild; };
  const el = (tag, o, kids) => {
    const e = document.createElement(tag); o = o || {};
    if (o.class) e.className = o.class;
    if (o.style) e.setAttribute('style', o.style);
    if (o.text !== undefined) e.textContent = o.text;
    if (o.html !== undefined) e.innerHTML = o.html;
    Object.entries(o.attrs || {}).forEach(([k, v]) => e.setAttribute(k, v));
    (kids || []).forEach((c) => e.append(c));
    return e;
  };
  const TextFx = {
    // splits the text into words once, then fades each in from the right, staggered
    fadeFromRight(e, t, t0, o) {
      o = o || {};
      const st = o.stagger === undefined ? 0.11 : o.stagger, dur = o.dur || 0.5, dx = o.dx === undefined ? 26 : o.dx;
      if (!e.__words) {
        const parts = e.textContent.split(/(\s+)/);
        e.textContent = ''; e.__words = [];
        parts.forEach((w) => { if (/^\s+$/.test(w)) { e.append(w); return; } const s = el('span', { text: w, style: 'display:inline-block' }); e.append(s); e.__words.push(s); });
      }
      e.__words.forEach((s, i) => { const k = eo(seg(t, t0 + i * st, t0 + i * st + dur)); s.style.opacity = k; s.style.transform = 'translateX(' + dx * (1 - k) + 'px)'; });
      return t0 + (e.__words.length - 1) * st + dur;
    },
  };
  const breathe = (t, amt, period) => 1 + (amt === undefined ? 0.012 : amt) * Math.sin((2 * Math.PI * t) / (period || 3.2));

  // a film's CSS is scoped to its own stage, so its class names never touch the dashboard
  const scope = (css, root) => css.replace(/([^{}]+)\{([^{}]*)\}/g, (m, sel, body) =>
    sel.split(',').map((x) => { x = x.trim(); return /^#stage\b/.test(x) ? x.replace(/^#stage\b/, root) : root + ' ' + x; }).join(', ') + '{' + body + '}');

  const films = {};
  window.FILMKIT = {
    film(id) {
      if (films[id]) return films[id].kit;
      const f = films[id] = { id, scenes: [], data: {}, root: null };
      f.kit = {
        seg, lerp, eo, ei, eio, eob, clamp01, TextFx, breathe, esc, h, el, baseCss: '',
        fonts: { mono: MONO, sans: SANS, display: SANS },
        scene: (sid, def) => f.scenes.push({ id: sid, def }),
        json: (name) => f.data[name],
        css: (text) => f.root.append(el('style', { text: scope(text, '#fm-' + f.id) })),
      };
      return f.kit;
    },
  };

  // ---------- data, built from the league files ----------
  const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
  const words = (n) => (n <= 20 ? WORDS[n] : n < 30 ? 'twenty-' + WORDS[n - 20] : String(n));
  const shortDate = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const scoredRounds = () => [...new Set(dash.data('scores').data.map((s) => +s.round))].sort((a, b) => a - b);

  function season() {
    const scores = dash.data('scores').data, teams = dash.data('teams').data, cal = dash.data('calendar').data;
    const rounds = scoredRounds();
    const T = Object.fromEntries(teams.map((t) => [t.team, t])), C = Object.fromEntries(cal.map((c) => [+c.round, c]));
    const pt = (team, r) => { const s = scores.find((x) => x.team === team && +x.round === r); return s ? +s.points : null; };
    const last = rounds[rounds.length - 1], next = cal.filter((c) => +c.round > last).sort((a, b) => a.round - b.round)[0];
    const left = cal.length - last;
    const meta = { year: cal.length ? new Date(cal[0].date).getUTCFullYear() : '', total: cal.length, last, words: words(rounds.length),
      line: 'Round ' + last + ' of ' + cal.length + (left > 0 ? ' · ' + words(left) + ' to go' + (next ? ', ' + next.city + ' next' : '') : ' · season complete') };
    const league = {
      season: meta,
      rounds: rounds.map((r) => ({ r, tag: 'R' + r, code: C[r].code, gp: C[r].grand_prix.replace(' Grand Prix', ' GP').replace(/ \(at (.*)\)/, ' · $1'), place: C[r].circuit })),
      teams: teams.map((t) => ({ team: t.team, code: t.code, color: t.color, joined: +t.joined_round })),
      points: Object.fromEntries(teams.map((t) => [t.team, rounds.map((r) => pt(t.team, r))])),
    };
    const cum = {}, stops = [];
    rounds.forEach((r) => {
      const c = C[r], rows = scores.filter((s) => +s.round === r).sort((a, b) => b.points - a.points);
      rows.forEach((s) => { cum[s.team] = (cum[s.team] || 0) + +s.points; });
      const lt = Object.keys(cum).reduce((a, b) => (cum[b] > cum[a] ? b : a));
      const note = /\(at /.test(c.grand_prix) ? 'The ' + c.grand_prix.replace(/ \(at .*\)/, '') + ', held at ' + c.city : rows.slice(0, 3).some((s) => /combined/i.test(s.note || '')) ? 'Two races, scored together' : '';
      stops.push({ r, code: c.code, gp: c.grand_prix.replace(/ \(at .*\)/, ''), circuit: c.circuit, city: c.city, country: c.country, date: shortDate(c.date), lat: +c.lat, lon: +c.lon,
        podium: rows.slice(0, 3).map((s) => ({ team: s.team, code: T[s.team].code, color: T[s.team].color, pts: +s.points })),
        leader: { team: lt, code: T[lt].code, color: T[lt].color, cum: cum[lt] }, note });
    });
    const final = Object.entries(cum).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t, v]) => ({ team: t, code: T[t].code, color: T[t].color, cum: v }));
    const geo = window.FILM_GEO || { land: [], tracks: { tracks: {} } };
    return { league, tour: { season: meta, stops, final, land: geo.land }, tracks: geo.tracks, cum };
  }

  // one round's podium and the standings before and after it
  function recap(r) {
    const st = dash.data('standings').data, scores = dash.data('scores').data, teams = dash.data('teams').data, cal = dash.data('calendar').data;
    const rs = scoredRounds(), i = rs.indexOf(r), pr = i > 0 ? rs[i - 1] : null;
    const tm = Object.fromEntries(teams.map((t) => [t.team, t]));
    const c = cal.find((x) => +x.round === r) || {};
    const results = scores.filter((s) => +s.round === r).map((s) => ({ team: s.team, color: tm[s.team].color, pts: +s.points, note: s.note || '' })).sort((a, b) => b.pts - a.pts);
    const now = st.filter((s) => +s.round === r).sort((a, b) => a.rank - b.rank);
    const before = pr === null ? {} : Object.fromEntries(st.filter((s) => +s.round === pr).map((s) => [s.team, s]));
    const standings = now.map((s) => {
      const b = before[s.team];
      return { team: s.team, color: tm[s.team].color, now: s.cum, prev: b ? b.cum : 0, rank: s.rank - 1,
        prevRank: b ? b.rank - 1 : pr === null ? s.rank - 1 : now.length - 1, pts: s.race_pts || 0, isNew: !b && pr !== null };
    });
    return { r, prev: pr, next: i < rs.length - 1 ? rs[i + 1] : null, gp: c.grand_prix ? c.grand_prix.replace(/ \(at (.*)\)/, ' at $1') : 'Round ' + r, circuit: c.circuit || '',
      date: c.date ? shortDate(c.date) : '', combined: results.some((x) => /combined/i.test(x.note)), results, standings };
  }

  // ---------- what each animation is ----------
  const top3 = (cum) => Object.entries(cum).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t, v], i) => 'P' + (i + 1) + ' ' + t + ' ' + nf.format(v)).join(', ');
  const INFO = {
    grid: {
      film: 'race', W: 1920, H: 1080, chapters: ['The race', 'Podium'],
      durs: (d) => [4.2 + d.league.rounds.length * 5 + 5.3, 6.5],
      cues: [[1.0, 'light'], [1.6, 'light'], [2.2, 'light'], [2.8, 'light'], [3.4, 'light']],
      title: (d) => 'Grid race · after R' + d.league.season.last,
      summary: (d) => 'An animated race of the league teams through rounds 1 to ' + d.league.season.last + ', each car moving up and down the order as its total changes. Standings after round ' +
        d.league.season.last + ': ' + top3(d.cum) + '. Every figure is also in the timing tower and race-by-race table on the page.',
    },
    tour: {
      film: 'tour', W: 1920, H: 1080, chapters: ['Opener', 'World tour', 'Standings'],
      durs: (d) => [4, window.GLOBE.timeline(d.tour, 6.6).end, 5],
      title: (d) => 'World tour · after R' + d.league.season.last,
      summary: (d) => 'An animated flight around a globe to every circuit raced so far, showing each round’s league podium: ' +
        d.tour.stops.map((s) => 'R' + s.r + ' ' + s.city + ', won by ' + s.podium[0].team).join('; ') + '. Standings: ' + top3(d.cum) + '. Every figure is also in the race podium card and race-by-race table on the page.',
    },
    recap: {
      film: 'recap', W: 1080, H: 1080, chapters: ['Race result', 'Standings'],
      durs: () => [5.5, 7.1],
      title: (d) => 'Race recap · R' + d.recap.r + ' ' + d.recap.gp,
      summary: (d) => {
        const x = d.recap, pod = x.results.slice(0, 3).map((s, i) => 'P' + (i + 1) + ' ' + s.team + ', ' + nf.format(s.pts) + ' points').join('; ');
        const moves = x.standings.filter((s) => s.prevRank !== s.rank && !s.isNew).map((s) => s.team + (s.prevRank > s.rank ? ' up ' : ' down ') + Math.abs(s.prevRank - s.rank)).join(', ');
        return 'Round ' + x.r + ', ' + x.gp + '. League podium: ' + pod + '. Championship top three: ' + x.standings.slice(0, 3).map((s) => s.team + ' ' + nf.format(s.now)).join(', ') + '.' +
          (moves ? ' Moves: ' + moves + '.' : ' No change in positions.') + ' The same figures are in the race podium card and timing tower on the page.';
      },
    },
  };
  const linkId = (cur) => (cur.key === 'recap' ? 'recap-' + cur.d.recap.r : 'film-' + cur.key);

  // ---------- the player ----------
  const dlg = document.getElementById('film');
  if (!dlg || !window.dash) return;
  const $ = (s) => dlg.querySelector(s);
  const wrap = $('#film-stage'), canvas = $('#film-canvas'), btnPlay = $('#film-play'), range = $('#film-seek');
  const chaps = $('#film-chaps'), status = $('#film-status'), btnSound = $('#film-sound'), btnPrev = $('#film-prev'), btnNext = $('#film-next');
  let cur = null, t = 0, playing = false, last = 0, raf = 0;
  const mmss = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  const setLink = (id) => { if (dash.setLink) dash.setLink(id); };

  function mount(key, round) {
    const info = INFO[key], f = films[info.film], d = season();
    if (key === 'recap') d.recap = recap(round);
    f.data = { 'league.json': d.league, 'tour.json': d.tour, 'tracks.json': d.tracks, 'recap.json': d.recap };
    canvas.replaceChildren();
    canvas.style.width = info.W + 'px'; canvas.style.height = info.H + 'px';
    f.root = el('div', { class: 'fm-root', attrs: { id: 'fm-' + f.id }, style: '--display:' + SANS + ';--sans:' + SANS + ';--mono:' + MONO });
    canvas.append(f.root);
    f.kit.css(f.kit.baseCss + '\n.tag, .pin { background:#D92B21 }');
    const durs = info.durs(d);
    let start = 0;
    const scenes = f.scenes.map((s, i) => {
      const box = el('div', { class: 'fm-scene' }); f.root.append(box);
      const k = Object.create(f.kit); k.stage = box;
      s.def.init.call(s.def, k);
      const o = { def: s.def, box, start, dur: durs[i] }; start += durs[i]; return o;
    });
    cur = { key, info, scenes, end: start, d };
    chaps.replaceChildren();
    scenes.forEach((s, i) => {
      s.btn = el('button', { text: (i + 1) + ' · ' + info.chapters[i], attrs: { type: 'button' } });
      s.btn.addEventListener('click', () => { setT(s.start + (REDUCED ? s.dur - 0.05 : 0)); if (!REDUCED) setPlaying(true); });
      chaps.append(s.btn);
    });
    range.max = String(Math.round(start * 10) / 10);
    btnSound.hidden = !info.cues;
    btnPrev.hidden = btnNext.hidden = key !== 'recap';
    if (key === 'recap') {
      btnPrev.disabled = d.recap.prev === null; btnNext.disabled = d.recap.next === null;
      btnPrev.setAttribute('aria-label', d.recap.prev === null ? 'No earlier round' : 'Previous round, R' + d.recap.prev);
      btnNext.setAttribute('aria-label', d.recap.next === null ? 'No later round' : 'Next round, R' + d.recap.next);
    }
    $('#film-title').textContent = info.title(d);
    $('#film-sum').textContent = info.summary(d);
    fit();
  }
  function render() {
    if (!cur) return;
    const s = cur.scenes.find((x) => t < x.start + x.dur) || cur.scenes[cur.scenes.length - 1];
    cur.scenes.forEach((x) => { x.box.style.display = x === s ? '' : 'none'; x.btn.setAttribute('aria-current', String(x === s)); });
    s.def.render.call(s.def, Math.min(t - s.start, s.dur - 0.0001));
  }
  function setT(v) {
    t = Math.max(0, Math.min(cur.end, v));
    render();
    range.value = String(t);
    range.setAttribute('aria-valuetext', mmss(t) + ' of ' + mmss(cur.end));
    $('#film-time').textContent = mmss(t) + ' / ' + mmss(cur.end);
    if (!playing) $('#film-play-txt').textContent = t >= cur.end - 0.01 ? 'Replay' : 'Play';
  }
  function setPlaying(on) {
    playing = on;
    $('#film-play-ico').textContent = on ? '❚❚' : '▶';
    $('#film-play-txt').textContent = on ? 'Pause' : t >= cur.end - 0.01 ? 'Replay' : 'Play';
    cancelAnimationFrame(raf);
    if (on) { last = performance.now(); raf = requestAnimationFrame(tick); }
  }
  function tick(now) {
    const dt = Math.min(0.1, (now - last) / 1000), from = t;
    last = now;
    setT(t + dt);
    if (soundOn && cur.info.cues) cur.info.cues.forEach(([at, kind]) => { if (at > from && at <= t) SFX[kind](); });
    if (t >= cur.end) { setPlaying(false); return; }
    raf = requestAnimationFrame(tick);
  }
  function fit() {
    if (!cur) return;
    const b = wrap.getBoundingClientRect(), s = Math.max(0.05, Math.min(b.width / cur.info.W, b.height / cur.info.H));
    canvas.style.transform = 'scale(' + s + ')';
    canvas.style.left = (b.width - cur.info.W * s) / 2 + 'px';
    canvas.style.top = (b.height - cur.info.H * s) / 2 + 'px';
  }
  if ('ResizeObserver' in window) new ResizeObserver(fit).observe(wrap); else addEventListener('resize', fit);

  // ---------- sound: only the grid race's start-lights countdown ----------
  // One clean electronic beep as each red light comes on; silence at lights out.
  // Synthesised in the browser, and nothing plays until someone presses play.
  let ac = null, soundOn = true, verb = null;
  const audio = () => {
    if (!ac) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ac = new A(); }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  };
  const room = (a) => {
    if (verb) return verb;
    const len = Math.floor(a.sampleRate * 0.35), ir = a.createBuffer(2, len, a.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    const cv = a.createConvolver(), wet = a.createGain(); cv.buffer = ir; wet.gain.value = 0.16;
    cv.connect(wet).connect(a.destination); verb = cv; return cv;
  };
  const SFX = {
    light() {
      const a = audio(); if (!a) return;
      const n = a.currentTime + 0.005, L = 0.2, bus = a.createGain(), hp = a.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = 300;
      bus.gain.setValueAtTime(0.0001, n); bus.gain.exponentialRampToValueAtTime(0.22, n + 0.004);
      bus.gain.setValueAtTime(0.22, n + L - 0.03); bus.gain.exponentialRampToValueAtTime(0.0001, n + L);
      [[1046.5, 'sine', 1], [1046.5, 'square', 0.12], [2093, 'sine', 0.08]].forEach(([fr, type, v]) => {
        const o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.value = fr; g.gain.value = v;
        o.connect(g).connect(bus); o.start(n); o.stop(n + L + 0.02);
      });
      bus.connect(hp); hp.connect(a.destination); hp.connect(room(a));
    },
  };
  const primeAudio = () => { if (soundOn && cur && cur.info.cues) audio(); };
  const showSound = () => { btnSound.setAttribute('aria-pressed', String(soundOn)); $('#film-sound-ico').textContent = soundOn ? '🔊' : '🔇'; };
  btnSound.addEventListener('click', () => { soundOn = !soundOn; showSound(); primeAudio(); });
  showSound();

  // ---------- controls ----------
  btnPlay.addEventListener('click', () => { primeAudio(); if (playing) { setPlaying(false); return; } if (t >= cur.end - 0.01) setT(0); setPlaying(true); });
  $('#film-replay').addEventListener('click', () => { primeAudio(); setT(0); setPlaying(true); });
  range.addEventListener('input', () => { setPlaying(false); setT(+range.value); });
  btnPrev.addEventListener('click', () => cur && cur.d.recap.prev !== null && open('recap', cur.d.recap.prev));
  btnNext.addEventListener('click', () => cur && cur.d.recap.next !== null && open('recap', cur.d.recap.next));
  dlg.addEventListener('keydown', (e) => {
    if (e.target === range || (e.target.closest('button') && (e.key === ' ' || e.key === 'Enter'))) return;
    if (e.key === ' ' || e.key === 'k') { e.preventDefault(); btnPlay.click(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); setT(t - 5); }
    if (e.key === 'ArrowRight') { e.preventDefault(); setT(t + 5); }
  });
  $('#film-copy').addEventListener('click', async () => {
    const base = (window.TL_CONFIG && TL_CONFIG.shareBase) || location.origin + location.pathname;
    const url = base + '#' + linkId(cur);
    try { await navigator.clipboard.writeText(url); status.textContent = 'Link copied — paste it into Slack.'; } catch (e) { status.textContent = 'Copy this link: ' + url; }
  });

  function open(key, round) {
    if (!INFO[key] || dash.data('standings').status !== 'ok') return;
    const rs = scoredRounds();
    if (key === 'recap' && !rs.includes(round)) round = rs[rs.length - 1];
    if (!dlg.open) dlg.showModal();
    if (cur) setPlaying(false);
    mount(key, round);
    setLink(linkId(cur));
    status.textContent = REDUCED ? 'Reduced motion is on, so this opens paused on its last frame. Press Play to watch it.' : '';
    setT(REDUCED ? cur.end - 0.05 : 0);
    if (!REDUCED) setPlaying(true);
  }
  function close() { setPlaying(false); if (dlg.open) dlg.close(); }
  $('#film-close').addEventListener('click', close);
  dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
  dlg.addEventListener('close', () => { if (dlg.open) return; setPlaying(false); setLink('watch'); canvas.replaceChildren(); cur = null; });

  // entry points: [data-film="grid|tour"], [data-recap="latest|selected|<round>"]
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-film], [data-recap]');
    if (!b) return;
    e.preventDefault();
    if (b.dataset.film) { if (soundOn && INFO[b.dataset.film].cues) audio(); open(b.dataset.film); return; }
    const v = b.dataset.recap, rs = scoredRounds(), sel = +dash.params().upto;
    open('recap', v === 'latest' ? rs[rs.length - 1] : v === 'selected' ? sel : +v);
  });
  const fromHash = () => {
    const f = /^#film-(grid|tour)$/.exec(location.hash), r = /^#recap-(\d+)$/.exec(location.hash);
    if (f) open(f[1]); else if (r) open('recap', +r[1]);
  };
  addEventListener('hashchange', fromHash);
  // the scene files load after this one, so open a linked animation once the page and data are ready
  let tried = false;
  const tryHash = () => { if (!tried && dash.data('standings').status === 'ok') { tried = true; fromHash(); } };
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', () => dash.onData(tryHash)); else setTimeout(() => dash.onData(tryHash), 0);
  window.__film = { open, setT: (v) => setT(v), close, get end() { return cur && cur.end; } };
})();
