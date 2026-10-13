window.FILMKIT.film("race").baseCss = "#stage { --ground:#0A0C0F; --main:#FF3B30; --second:#F2F4F7; --accent:#B57BFF; color:var(--second); font-family:var(--sans, system-ui, sans-serif) }\n.ground { position:absolute; inset:0; background:var(--ground); overflow:hidden }\n.ground::before { content:''; position:absolute; inset:0; background-image:linear-gradient(color-mix(in srgb, var(--second) 5%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--second) 5%, transparent) 1px, transparent 1px); background-size:60px 60px }\n.words { position:absolute; margin:0; display:flex; flex-direction:column; gap:20px } .words > * { margin:0 }\n.line { font-family:var(--display, var(--sans, system-ui, sans-serif)); font-size:96px; line-height:1.02; font-weight:900; letter-spacing:-0.01em } .sub { font-size:34px; font-weight:400; color:color-mix(in srgb, var(--second) 72%, var(--ground)) }\n.mono { font-family:var(--mono, ui-monospace, monospace); font-variant-numeric:tabular-nums } .eyebrow { font-family:var(--mono, ui-monospace, monospace); font-size:24px; letter-spacing:.22em; text-transform:uppercase; color:color-mix(in srgb, var(--second) 68%, var(--ground)) }\n.red { color:var(--main) } .purple { color:var(--accent) }\n.stripe { position:absolute; left:0; right:0; top:0; height:8px; background:linear-gradient(90deg, var(--main) 0 38%, transparent 38% 40%, var(--main) 40% 42%, transparent 42% 44%, var(--main) 44% 45%, transparent 45%) }\n.panel { position:absolute; background:color-mix(in srgb, var(--ground) 90%, var(--second)); border:1px solid color-mix(in srgb, var(--second) 14%, transparent); border-radius:14px }\n.tag { font-family:var(--mono, ui-monospace, monospace); font-size:22px; font-weight:700; letter-spacing:.08em; padding:6px 12px; border-radius:6px; background:var(--main); color:var(--second) }\n.pos { font-family:var(--mono, ui-monospace, monospace); font-weight:700; font-size:30px; font-variant-numeric:tabular-nums }\n.team { font-family:var(--sans, system-ui, sans-serif); font-weight:600; font-size:30px; white-space:nowrap }\n.code { font-family:var(--mono, ui-monospace, monospace); font-weight:700; font-size:22px; letter-spacing:.06em }\n.art { position:absolute; inset:0; width:100%; height:100%; overflow:visible }\n";
/* Grid race: the league as cars on a track, lights out to the chequered flag.
   Scenes 'race' and 'flag', played by assets/js/films.js on a 1920 × 1080 stage. */
(function (kit) {
const { seg, eo, ei, eio, lerp, clamp01 } = kit;
// lanes share a fixed-height track, so a bigger league gets narrower lanes
const TOP = 214, TRACK = 792, LEAD_X = 1250, FIN_X = 1790, PIT_X = 470;
const LIGHTS = [1.0, 1.6, 2.2, 2.8, 3.4], GO = 4.2, SEGL = 5, MOVE = 2.6, FIRST = 3.2;
const SPEED = 640;
let ROW = 72, NL = 11;
const CAR = '<svg viewBox="0 0 120 40" width="120" height="40"><rect x="0" y="5" width="12" height="30" rx="2" fill="currentColor" opacity=".75"/><rect x="16" y="0" width="20" height="10" rx="3" fill="#15181C"/><rect x="16" y="30" width="20" height="10" rx="3" fill="#15181C"/><path d="M10 16 H30 L44 9 H70 L82 14 H104 L112 18 V22 L104 26 H82 L70 31 H44 L30 24 H10 Z" fill="currentColor"/><rect x="80" y="2" width="16" height="9" rx="3" fill="#15181C"/><rect x="80" y="29" width="16" height="9" rx="3" fill="#15181C"/><rect x="106" y="6" width="8" height="28" rx="2" fill="currentColor" opacity=".75"/><ellipse cx="58" cy="20" rx="9" ry="5" fill="#15181C"/></svg>';
const fmt = (v) => Math.round(v).toLocaleString('en-GB');
const travel = (t) => { const u = t - GO; if (u <= 0) return 0; return u < 1.5 ? SPEED * u * u / 3 : SPEED * (u - 0.75); };
kit.scene('race', {
  init(kit) {
    const L = kit.json('league.json'), R = this.R = L.rounds, teams = this.teams = L.teams, n = R.length;
    NL = teams.length; ROW = Math.min(72, Math.floor(TRACK / NL));
    this.TF = GO + n * SEGL;
    const cum = {}, S = [];
    R.forEach((r, k) => {
      teams.forEach((tm) => { const p = L.points[tm.team][k]; if (p !== null) cum[tm.team] = (cum[tm.team] || 0) + p; });
      const on = teams.filter((tm) => cum[tm.team] !== undefined).sort((a, b) => cum[b.team] - cum[a.team]);
      const off = teams.filter((tm) => cum[tm.team] === undefined);
      const lead = cum[on[0].team], gapMax = lead - cum[on[on.length - 1].team], sc = Math.min(0.55, 760 / Math.max(1, gapMax));
      const pts = teams.map((tm) => L.points[tm.team][k]).filter((p) => p !== null);
      const best = Math.max(...pts), st = {};
      [...on, ...off].forEach((tm, i) => {
        const v = cum[tm.team], isOn = v !== undefined, p = L.points[tm.team][k];
        st[tm.team] = { v: v || 0, rank: i, on: isOn, x: isOn ? LEAD_X - (lead - v) * sc : PIT_X, d: p, best: p === best };
      });
      st.pod = on.map((tm) => ({ tm, p: L.points[tm.team][k] })).filter((o) => o.p !== null).sort((a, b) => b.p - a.p).slice(0, 3);
      S.push(st);
    });
    const g = {}, lanes = [...teams].sort((a, b) => S[0][a.team].rank - S[0][b.team].rank);
    lanes.forEach((tm, i) => { const s = S[0][tm.team]; g[tm.team] = { ...s, v: 0, d: null, x: s.on ? 780 - i * 50 - (i % 2) * 20 : PIT_X }; });
    this.S = [g, ...S]; this.lane = Object.fromEntries(lanes.map((tm, i) => [tm.team, i]));
    kit.css('.rc-track{position:absolute;left:360px;right:0;top:' + (TOP - 8) + 'px;height:' + (ROW * NL + 16) + 'px;background:color-mix(in srgb, var(--ground) 94%, var(--second))}' +
      '.rc-kerb{position:absolute;left:360px;right:0;height:12px;background:repeating-linear-gradient(90deg, var(--main) 0 60px, var(--second) 60px 120px);opacity:.75}' +
      '.rc-dash{position:absolute;left:360px;right:0;height:2px;background:repeating-linear-gradient(90deg, color-mix(in srgb, var(--second) 22%, transparent) 0 44px, transparent 44px 120px)}' +
      '.rc-bg{position:absolute;left:360px;right:0;top:' + (TOP - 8) + 'px;height:' + (ROW * NL + 16) + 'px;margin:0;padding-bottom:.05em;box-sizing:border-box;display:flex;align-items:center;justify-content:center;text-align:center;font-family:var(--display, var(--sans, system-ui, sans-serif));font-weight:900;font-size:440px;line-height:1;color:transparent;-webkit-text-stroke:2px color-mix(in srgb, var(--second) 12%, transparent);white-space:nowrap}' +
      '.rc-place{position:absolute;left:360px;right:0;top:930px;text-align:center;font-size:26px;letter-spacing:.3em}' +
      '.rc-gantry{position:absolute;top:' + (TOP - 40) + 'px;width:4px;height:' + (ROW * NL + 60) + 'px;background:color-mix(in srgb, var(--second) 30%, transparent)}' +
      '.rc-gantry span{position:absolute;left:-2px;top:0;transform:translateX(-50%);white-space:nowrap}' +
      '.rc-slot{position:absolute;width:150px;height:46px;border:3px solid color-mix(in srgb, var(--second) 40%, transparent);border-right:0}' +
      '.rc-fin{position:absolute;left:' + FIN_X + 'px;top:' + (TOP - 8) + 'px;width:36px;height:' + (ROW * NL + 16) + 'px;background:repeating-conic-gradient(var(--second) 0 25%, var(--ground) 0 50%) 0 0/36px 36px}' +
      '.rc-car{position:absolute;left:0;top:0}.rc-lab{position:absolute;left:0;top:0;white-space:nowrap;font-size:22px;font-weight:700}.rc-lab em{font-style:normal;font-weight:400;margin-left:10px}.rc-lab small{font-size:18px;margin-left:10px}' +
      '.rc-tow{position:absolute;left:40px;width:290px;height:60px;display:grid;grid-template-columns:52px 6px 1fr auto;align-items:center;gap:12px;font-size:24px}.rc-tow i{width:6px;height:30px;border-radius:3px}' +
      '.rc-head{position:absolute;left:40px;top:34px;display:flex;flex-direction:column;gap:10px}.rc-head > *{margin:0}.rc-head .line{font-size:56px;white-space:nowrap;margin:0}.rc-hgp{display:flex;align-items:center;gap:16px}' +
      '.rc-scrim{position:absolute;inset:0;background:color-mix(in srgb, var(--ground) 72%, transparent)}' +
      '.rc-rig{position:absolute;left:' + (1140 - 461) + 'px;top:' + (TOP - 8 + (ROW * NL + 16) / 2 - 173) + 'px;width:922px;height:346px;box-sizing:border-box;display:flex;gap:28px;padding:30px;border-radius:24px;background:#050607;border:2px solid color-mix(in srgb, var(--second) 18%, transparent);box-shadow:0 30px 80px rgba(0,0,0,.6);transform-origin:50% 0}' +
      '.rc-rig .col{flex:1;display:grid;gap:22px;justify-items:center;padding:22px 0;border-radius:16px;background:color-mix(in srgb, var(--ground) 92%, var(--second))}' +
      '.rc-rig b{width:110px;height:110px;border-radius:50%;background:color-mix(in srgb, var(--ground) 70%, var(--second));position:relative}' +
      '.rc-out{position:absolute;left:360px;right:0;top:' + (TOP - 8 + (ROW * NL + 16) / 2 - 60) + 'px;margin:0;text-shadow:0 6px 40px rgba(0,0,0,.8);text-align:center;font-family:var(--display, var(--sans, system-ui, sans-serif));font-weight:900;font-size:120px;line-height:1;letter-spacing:-0.01em;opacity:0}' +
      '.rc-rig b::after{content:"";position:absolute;inset:0;border-radius:50%;background:var(--main);box-shadow:0 0 60px 10px color-mix(in srgb, var(--main) 70%, transparent);opacity:var(--on,0)}' +
      '.rc-pod{position:absolute;right:64px;top:30px;display:flex;align-items:flex-end;gap:8px}.rc-pod div{width:150px;display:grid;gap:4px;text-align:center;font-size:18px}' +
      '.rc-pod i{display:flex;justify-content:center;align-items:flex-start;padding-top:4px;font-style:normal;font-weight:700;font-size:18px;border-radius:6px 6px 0 0;background:color-mix(in srgb, var(--ground) 84%, var(--second));border-top:4px solid currentColor}');
    let h = '<div class="ground"><div class="stripe"></div><div class="rc-track"></div>';
    h += '<p class="rc-bg rc-big"></p><p class="eyebrow rc-place"></p>';
    for (let i = 0; i <= NL; i++) h += '<i class="rc-dash" style="top:' + (TOP + i * ROW - 1) + 'px"></i>';
    h += '<i class="rc-kerb rc-k1" style="top:' + (TOP - 20) + 'px"></i><i class="rc-kerb rc-k2" style="top:' + (TOP + ROW * NL + 8) + 'px"></i>';
    lanes.forEach((tm, i) => { const s = g[tm.team]; if (s.on) h += '<i class="rc-slot" style="left:' + (s.x - 132) + 'px;top:' + (TOP + i * ROW + (ROW - 46) / 2) + 'px"></i>'; });
    h += '<div class="rc-gantry rc-g"><span class="tag rc-gtag"></span></div><div class="rc-fin"></div>';
    teams.forEach((tm) => { h += '<span class="rc-car" style="color:' + tm.color + '">' + CAR + '</span><span class="rc-lab mono"><span style="color:' + tm.color + '">' + kit.esc(tm.code) + '</span><em></em><small></small></span>'; });
    teams.forEach((tm) => { h += '<div class="rc-tow mono"><span class="pos"></span><i style="background:' + tm.color + '"></i><span>' + kit.esc(tm.code) + '</span><span class="rc-tv"></span></div>'; });
    h += '<div class="rc-head"><p class="eyebrow rc-eye"></p><div class="rc-hgp"><span class="tag rc-tag"></span><h2 class="line rc-gp"></h2></div></div>';
    h += '<div class="rc-scrim"></div><div class="rc-rig">' + '<span class="col"><b></b><b></b></span>'.repeat(5) + '</div><p class="rc-out">Lights out</p><div class="rc-pod"></div></div>';
    kit.stage.append(kit.h(h));
    const q = (s) => kit.stage.querySelector(s), qa = (s) => [...kit.stage.querySelectorAll(s)];
    this.cars = qa('.rc-car').map((e) => e.style); this.labs = qa('.rc-lab'); this.tows = qa('.rc-tow');
    this.dash = qa('.rc-dash').map((e) => e.style); this.k1 = q('.rc-k1').style; this.k2 = q('.rc-k2').style;
    this.big = q('.rc-big'); this.place = q('.rc-place'); this.gan = q('.rc-g').style; this.gtag = q('.rc-gtag'); this.fin = q('.rc-fin').style;
    this.eye = q('.rc-eye'); this.tag = q('.rc-tag'); this.gp = q('.rc-gp'); this.head = q('.rc-head').style;
    this.rig = q('.rc-rig'); this.cols = qa('.rc-rig .col'); this.bulbs = qa('.rc-rig b'); this.scrim = q('.rc-scrim').style; this.outT = q('.rc-out').style; this.slots = qa('.rc-slot').map((e) => e.style);
    const pod = q('.rc-pod'); this.podEl = pod; this.pods = [];
    [1, 0, 2].forEach((i) => { const d = kit.el('div', {}); const nm = kit.el('span', { class: 'mono' }); const pt = kit.el('span', { class: 'mono' }); const b = kit.el('i', { style: 'height:' + [44, 30, 22][i] + 'px', text: 'P' + (i + 1) }); d.append(nm, pt, b); pod.append(d); this.pods[i] = { d, nm, pt, b }; });
    this.shownK = -1;
  },
  render(t) {
    const TF = this.TF;
    const n = this.R.length, S = this.S;
    let k = t < GO ? 0 : Math.min(n, Math.floor((t - GO) / SEGL) + 1);
    const sk = GO + (k - 1) * SEGL, p = k ? eio(seg(t, sk, sk + (k === 1 ? FIRST : MOVE))) : 0;
    const A = S[Math.max(0, k - 1)], B = S[k];
    const d = travel(t);
    this.dash.forEach((s) => { s.backgroundPosition = (-d % 120) + 'px 0'; });
    this.k1.backgroundPosition = this.k2.backgroundPosition = (-d % 120) + 'px 0';
    this.slots.forEach((s) => { s.transform = 'translateX(' + (-d) + 'px)'; s.opacity = 1 - seg(t, GO + 1.5, GO + 2.5); });
    // lights
    const out = t >= GO - 0.001;
    this.cols.forEach((c, i) => { const on = out ? '0' : eo(seg(t, LIGHTS[i], LIGHTS[i] + 0.08)).toFixed(3); c.children[0].style.setProperty('--on', on); c.children[1].style.setProperty('--on', on); });
    const ex = eo(seg(t, GO + 0.7, GO + 1.5));
    this.rig.style.opacity = eo(seg(t, 0.1, 0.6)) * (1 - ex) * (1 - 0.65 * eo(seg(t, GO, GO + 0.2)));
    this.rig.style.transform = 'translateY(' + lerp(0, -200, ex) + 'px) scale(' + lerp(1, 0.6, ex) + ')';
    this.scrim.opacity = 1 - eo(seg(t, GO, GO + 1.0));
    this.outT.opacity = eo(seg(t, GO, GO + 0.15)) * (1 - eo(seg(t, GO + 1.0, GO + 1.6)));
    this.outT.transform = 'scale(' + lerp(1.15, 1, eo(seg(t, GO, GO + 0.4))) + ')';
    // heading + backdrop
    const flipP = k ? seg(t, sk - 0.3, sk + 0.3) : 0, showK = k && flipP >= 0.5 ? k : Math.max(0, k - 1);
    const r = showK ? this.R[showK - 1] : null;
    if (this.shownK !== showK) {
      this.shownK = showK;
      this.eye.textContent = r ? 'Cumulative points · aston martpx F1 Fantasy' : 'aston martpx F1 Fantasy · ' + kit.json('league.json').season.year + ' season';
      this.tag.textContent = r ? r.tag : 'Grid'; this.gp.textContent = r ? r.gp : 'The ' + kit.json('league.json').season.year + ' grid race';
      this.big.textContent = r ? r.code : ''; this.place.textContent = r ? r.place : '';
    }
    const fl = k ? Math.abs(flipP - 0.5) * 2 : 1;
    this.head.opacity = fl;
    this.big.style.opacity = this.place.style.opacity = fl * (t > TF + 0.5 ? 1 - seg(t, TF + 0.5, TF + 1.5) : 1);
    this.big.style.transform = 'translateX(' + (-(t - (k ? sk : 0)) * 14) + 'px)';
    // gantry passes at each round start
    const gt = k ? t - sk : -9;
    this.gan.transform = 'translateX(' + (2000 - (gt + 0.4) * SPEED) + 'px)';
    this.gan.opacity = k && gt > -0.4 && gt < 3.4 ? 1 : 0;
    if (k) this.gtag.textContent = this.R[k - 1].tag + ' ' + this.R[k - 1].code;
    // race podium for the round, after positions settle
    let pk = 0, podA = 0;
    if (k && t >= sk + MOVE - 0.2) { pk = k; podA = eo(seg(t, sk + MOVE - 0.2, sk + MOVE + 0.3)) * (k < n ? 1 - seg(t, sk + SEGL - 0.4, sk + SEGL) : 1); }
    if (pk > 0) S[pk].pod.forEach((o, i) => { const e = this.pods[i]; e.nm.textContent = o.tm.code; e.nm.style.color = o.tm.color; e.pt.textContent = fmt(o.p); e.b.style.color = o.tm.color; });
    this.podEl.style.opacity = podA * (t > TF ? 1 - seg(t, TF, TF + 0.6) : 1);
    // finish line
    this.fin.opacity = eo(seg(t, TF - 1.6, TF - 0.6));
    this.fin.transform = 'translateX(' + lerp(260, 0, eo(seg(t, TF - 1.6, TF - 0.4))) + 'px)';
    // cars
    const wob = eo(seg(t, GO + 1, GO + 3));
    this.teams.forEach((tm, i) => {
      const a = A[tm.team], b = B[tm.team];
      let x = lerp(a.x, b.x, p);
      const live = a.on || b.on;
      if (live && t >= GO) x += wob * (9 * Math.sin(t * 2.24 + i * 1.7) + 4 * Math.sin(t * 3.7 + i));
      if (t >= TF) { const ts = TF + b.rank * 0.16; x += (2300 - x) * ei(seg(t, ts, ts + 2.2)); }
      const rk = lerp(a.rank, b.rank, p);
      const y = TOP + rk * ROW + (ROW - 40) / 2 + (live && t >= GO ? Math.sin(t * 19 + i) * 0.8 : 0);
      const op = b.on ? lerp(a.on ? 1 : 0.3, 1, a.on ? 1 : p) : 0.3;
      const c = this.cars[i]; c.transform = 'translate(' + (x - 120) + 'px,' + y + 'px)'; c.opacity = op;
      const lab = this.labs[i], v = lerp(a.v, b.v, p);
      lab.style.transform = 'translate(' + (x + 14) + 'px,' + (y + 6) + 'px)'; lab.style.opacity = op;
      lab.children[1].textContent = live ? fmt(v) : 'pit · joins ' + this.R.find((q) => q.r >= tm.joined).tag;
      const dA = k && b.d !== null ? eo(seg(t, sk + MOVE - 0.4, sk + MOVE)) * (1 - seg(t, sk + SEGL - 0.2, sk + SEGL + 0.2)) : 0;
      lab.children[2].textContent = b.d === null ? '' : (b.d >= 0 ? '+' : '−') + Math.abs(b.d);
      lab.children[2].style.color = b.best ? 'var(--accent)' : 'color-mix(in srgb, var(--second) 70%, var(--ground))';
      lab.children[2].style.opacity = k === n ? dA * (1 - seg(t, TF, TF + 0.4)) : dA;
      const tw = this.tows[i];
      tw.style.transform = 'translateY(' + (TOP + (ROW - 60) / 2 + rk * ROW) + 'px)'; tw.style.opacity = live ? 1 : 0.35;
      tw.children[0].textContent = live ? 'P' + (Math.round(rk) + 1) : 'PIT';
      tw.children[3].textContent = live ? fmt(v) : '—';
    });
  },
});

})(window.FILMKIT.film("race"));
(function (kit) {
const { seg, eo, eob, lerp, TextFx } = kit;
const CAR = '<svg viewBox="0 0 120 40" width="180" height="60"><rect x="0" y="5" width="12" height="30" rx="2" fill="currentColor" opacity=".75"/><rect x="16" y="0" width="20" height="10" rx="3" fill="#15181C"/><rect x="16" y="30" width="20" height="10" rx="3" fill="#15181C"/><path d="M10 16 H30 L44 9 H70 L82 14 H104 L112 18 V22 L104 26 H82 L70 31 H44 L30 24 H10 Z" fill="currentColor"/><rect x="80" y="2" width="16" height="9" rx="3" fill="#15181C"/><rect x="80" y="29" width="16" height="9" rx="3" fill="#15181C"/><rect x="106" y="6" width="8" height="28" rx="2" fill="currentColor" opacity=".75"/><ellipse cx="58" cy="20" rx="9" ry="5" fill="#15181C"/></svg>';
kit.scene('flag', {
  init(kit) {
    const L = kit.json('league.json');
    const tot = L.teams.map((tm) => ({ ...tm, v: L.points[tm.team].reduce((a, b) => a + (b || 0), 0) })).sort((a, b) => b.v - a.v);
    const top = tot.slice(0, 3), lastR = L.rounds[L.rounds.length - 1];
    this.top = top;
    kit.css('.flag-band{position:absolute;left:-200px;right:-200px;height:64px;background:repeating-conic-gradient(var(--second) 0 25%, var(--ground) 0 50%) 0 0/64px 64px;opacity:.9}' +
      '.flag-words{left:120px;top:300px;width:760px}.flag-words .line{font-size:104px}' +
      '.flag-pod{position:absolute;bottom:64px;width:240px;display:grid;justify-items:center;gap:14px}' +
      '.flag-blk{width:240px;border-radius:12px 12px 0 0;display:flex;justify-content:center;padding-top:18px;font-size:56px;font-weight:700;background:color-mix(in srgb, var(--ground) 86%, var(--second));border-top:6px solid currentColor}' +
      '.flag-car{display:block;height:60px;margin:60px 0 50px;transform:rotate(-90deg)}' +
      '.flag-pod .team{font-size:28px;text-align:center;white-space:normal;line-height:1.1;width:260px}' +
      '.flag-pts{font-size:40px;font-weight:700}');
    const H = [300, 220, 170], X = [1290, 1030, 1550];
    let pods = '';
    top.forEach((tm, i) => {
      pods += '<div class="flag-pod" style="left:' + X[i] + 'px;color:' + tm.color + '"><span class="flag-car">' + CAR + '</span>' +
        '<span class="team" style="color:var(--second)">' + kit.esc(tm.team) + '</span><span class="flag-pts mono" style="color:var(--second)"></span>' +
        '<div class="flag-blk mono" style="height:' + H[i] + 'px"><span style="color:var(--second)">P' + (i + 1) + '</span></div></div>';
    });
    const lead = top[0].v - top[1].v;
    kit.stage.append(kit.h('<div class="ground"><div class="flag-band flag-top" style="top:0"></div>' + pods +
      '<div class="flag-band flag-bot" style="bottom:0"></div>' +
      '<div class="words flag-words"><p class="eyebrow">Chequered flag · after ' + kit.esc(lastR.tag + ' ' + lastR.gp) + '</p>' +
      '<h2 class="line flag-title">' + kit.esc(top[0].team) + ' leads the grid</h2>' +
      '<p class="sub flag-sub">' + lead.toLocaleString('en-GB') + ' points clear of ' + kit.esc(top[1].team) + '</p>' +
      '<p class="eyebrow flag-next">' + kit.esc(L.season.line) + '</p></div></div>'));
    const q = (s) => kit.stage.querySelector(s);
    this.bt = q('.flag-top').style; this.bb = q('.flag-bot').style;
    this.title = q('.flag-title'); this.sub = q('.flag-sub').style; this.next = q('.flag-next').style;
    this.pods = [...kit.stage.querySelectorAll('.flag-pod')].map((el) => ({ s: el.style, pts: el.querySelector('.flag-pts') }));
  },
  render(t) {
    const sweep = eo(seg(t, 0, 0.9));
    this.bt.transform = 'translateX(' + (lerp(-1900, 0, sweep) + t * 18) + 'px)';
    this.bb.transform = 'translateX(' + (lerp(1900, 0, sweep) - t * 18) + 'px)';
    TextFx.fadeFromRight(this.title, t, 0.4);
    this.sub.opacity = eo(seg(t, 1.0, 1.5));
    this.sub.transform = 'translateX(' + lerp(26, 0, eo(seg(t, 1.0, 1.5))) + 'px)';
    this.next.opacity = eo(seg(t, 1.5, 2.0)) * 0.9;
    const order = [1, 0, 2];
    this.pods.forEach((p, i) => {
      const a = 0.5 + order[i] * 0.22, k = seg(t, a, a + 0.7);
      p.s.transform = 'translateY(' + lerp(420, 0, eob(k, 1.5)) + 'px) scale(' + kit.breathe(t, 0.006) + ')';
      p.s.opacity = eo(seg(t, a, a + 0.25));
      const v = this.top[i].v;
      p.pts.textContent = Math.round(lerp(v * 0.5, v, eo(seg(t, a + 0.1, a + 1.3)))).toLocaleString('en-GB') + ' pts';
    });
  },
});

})(window.FILMKIT.film("race"));