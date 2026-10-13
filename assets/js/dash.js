/*
  dash.js — the site's small data layer.
  Reads the league data in /data, runs the calculations app.js registers,
  and keeps the chosen round and focus team in the page URL
  (for example ?round=9&team=Champion_1) so any view can be shared as a link.
  It mirrors the small part of the Claude dashboard runtime that app.js uses.
*/
(function () {
  const SOURCES = {
    scores: 'data/scores.js',
    teams: 'data/teams.js',
    calendar: 'data/calendar.js',
  };
  const store = {};
  const calcs = [];
  const subscribers = [];
  Object.keys(SOURCES).forEach((id) => { store[id] = { status: 'loading', data: [] }; });

  const readParams = () => {
    const q = new URLSearchParams(location.search);
    const round = q.get('round');
    return { upto: round ? Number(round) : null, focus: q.get('team') || null };
  };
  let params = readParams();

  const emit = () => subscribers.forEach((fn) => {
    try { fn(); } catch (err) { console.error(err); }
  });

  const runCalcs = () => calcs.forEach((c) => {
    if (!c.inputs.every((id) => store[id] && store[id].status === 'ok')) {
      store[c.id] = { status: 'error', data: [], message: 'An input failed to load' };
      return;
    }
    try {
      store[c.id] = { status: 'ok', data: c.fn(...c.inputs.map((id) => store[id].data)) };
    } catch (err) {
      store[c.id] = { status: 'error', data: [], message: err.message };
      console.error(err);
    }
  });

  window.dash = {
    data: (id) => store[id] || { status: 'missing', data: [] },
    calc: (id, opts) => { calcs.push({ id, inputs: opts.inputs, fn: opts.fn }); store[id] = { status: 'loading', data: [] }; },
    onData: (fn) => { subscribers.push(fn); fn(); },
    params: () => ({ ...params }),
    setParams: (next) => {
      params = { ...params, ...next };
      const q = new URLSearchParams(location.search);
      if (params.upto) q.set('round', params.upto); else q.delete('round');
      if (params.focus) q.set('team', params.focus); else q.delete('team');
      const qs = q.toString();
      history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
      emit();
    },
    // names the place on the page in the address, so it can be shared (#recap-17, #accessibility)
    setLink: (id) => history.replaceState(null, '', location.pathname + location.search + (id && id !== 'top' && id !== 'watch' ? '#' + id : '')),
  };

  // The data files (data/*.js) set window.LEAGUE_DATA before this runs, so the
  // site works from GitHub Pages and when index.html is opened straight from disk.
  const loaded = window.LEAGUE_DATA || {};
  Object.keys(SOURCES).forEach((id) => {
    store[id] = Array.isArray(loaded[id])
      ? { status: 'ok', data: loaded[id] }
      : { status: 'error', data: [], message: SOURCES[id] + ' did not load' };
  });
  const start = () => { runCalcs(); emit(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else setTimeout(start, 0);

  let width = innerWidth, timer;
  addEventListener('resize', () => {
    if (innerWidth === width) return;
    width = innerWidth;
    clearTimeout(timer);
    timer = setTimeout(emit, 150);
  });
  addEventListener('popstate', () => { params = readParams(); emit(); });
})();
