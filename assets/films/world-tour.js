window.FILMKIT.film("tour").baseCss = "#stage { --ground:#0A0C0F; --main:#FF3B30; --second:#F2F4F7; --accent:#B57BFF; color:var(--second); font-family:var(--sans, system-ui, sans-serif) }\n.ground { position:absolute; inset:0; background:var(--ground); overflow:hidden }\n.ground::before { content:''; position:absolute; inset:0; background-image:linear-gradient(color-mix(in srgb, var(--second) 5%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--second) 5%, transparent) 1px, transparent 1px); background-size:60px 60px }\n.words { position:absolute; margin:0; display:flex; flex-direction:column; gap:20px } .words > * { margin:0 }\n.line { font-family:var(--display, var(--sans, system-ui, sans-serif)); font-size:96px; line-height:1.02; font-weight:900; letter-spacing:-0.01em } .sub { font-size:34px; font-weight:400; color:color-mix(in srgb, var(--second) 72%, var(--ground)) }\n.mono { font-family:var(--mono, ui-monospace, monospace); font-variant-numeric:tabular-nums } .eyebrow { font-family:var(--mono, ui-monospace, monospace); font-size:24px; letter-spacing:.22em; text-transform:uppercase; color:color-mix(in srgb, var(--second) 68%, var(--ground)) }\n.red { color:var(--main) } .purple { color:var(--accent) }\n.stripe { position:absolute; left:0; right:0; top:0; height:8px; background:linear-gradient(90deg, var(--main) 0 38%, transparent 38% 40%, var(--main) 40% 42%, transparent 42% 44%, var(--main) 44% 45%, transparent 45%) }\n.panel { position:absolute; background:color-mix(in srgb, var(--ground) 90%, var(--second)); border:1px solid color-mix(in srgb, var(--second) 14%, transparent); border-radius:14px }\n.tag { font-family:var(--mono, ui-monospace, monospace); font-size:22px; font-weight:700; letter-spacing:.08em; padding:6px 12px; border-radius:6px; background:var(--main); color:var(--second) }\n.pos { font-family:var(--mono, ui-monospace, monospace); font-weight:700; font-size:30px; font-variant-numeric:tabular-nums }\n.team { font-family:var(--sans, system-ui, sans-serif); font-weight:600; font-size:30px; white-space:nowrap }\n.code { font-family:var(--mono, ui-monospace, monospace); font-weight:700; font-size:22px; letter-spacing:.06em }\n.art { position:absolute; inset:0; width:100%; height:100%; overflow:visible }\n.globe { position:absolute; inset:0; width:1920px; height:1080px }\n.hud { position:absolute; left:64px; top:50px; display:flex; flex-direction:column; gap:8px }\n.card { position:absolute; left:1240px; top:230px; width:600px; padding:36px 40px; display:flex; flex-direction:column; gap:14px; background:color-mix(in srgb, var(--ground) 90%, var(--second)); border:1px solid color-mix(in srgb, var(--second) 14%, transparent); border-radius:14px; border-top:6px solid var(--main) }\n.card h2 { margin:0; font-family:var(--display, var(--sans, system-ui, sans-serif)); font-size:58px; line-height:1.02; font-weight:900 }\n.card .sub { font-size:28px }\n.rows { display:flex; flex-direction:column; gap:10px; margin-top:12px }\n.prow { display:grid; grid-template-columns:64px 8px 1fr auto; align-items:center; gap:16px; padding:12px 0; border-top:1px solid color-mix(in srgb, var(--second) 12%, transparent) }\n.prow .pos { font-size:30px } .prow i { width:8px; height:36px; border-radius:4px }\n.prow .team { font-size:30px; overflow:hidden; text-overflow:ellipsis } .prow b { font-family:var(--mono, ui-monospace, monospace); font-size:34px; font-variant-numeric:tabular-nums }\n.foot { font-family:var(--mono, ui-monospace, monospace); font-size:20px; letter-spacing:.1em; text-transform:uppercase; color:color-mix(in srgb, var(--second) 68%, var(--ground)); margin-top:6px }\n.pin { position:absolute; left:0; top:0; font-family:var(--mono, ui-monospace, monospace); font-size:22px; font-weight:700; letter-spacing:.08em; padding:6px 12px; border-radius:6px; background:var(--main); color:var(--second); white-space:nowrap }\n\n.podium { display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; align-items:end; margin-top:14px }\n.ps { display:grid; gap:8px; text-align:center; justify-items:center }\n.ps .team { font-size:24px; line-height:1.15; white-space:normal; min-height:2.3em; display:flex; align-items:flex-end; justify-content:center }\n.ps b { font-family:var(--mono, ui-monospace, monospace); font-size:34px; font-variant-numeric:tabular-nums }\n.ps i { width:100%; display:flex; justify-content:center; padding-top:10px; font-style:normal; font-family:var(--mono, ui-monospace, monospace); font-size:30px; font-weight:700; border-radius:8px 8px 0 0; background:color-mix(in srgb, var(--ground) 80%, var(--second)); border-top:6px solid currentColor; transform-origin:50% 100% }\n.ps.p1 i { height:150px } .ps.p2 i { height:105px } .ps.p3 i { height:75px }\n";
window.GLOBE = {
  make(kit, tour, canvas) {
    const cs = getComputedStyle(kit.stage), col = (n, f) => (cs.getPropertyValue(n) || f).trim();
    const C = { main: col('--main', '#FF3B30'), second: col('--second', '#F2F4F7'), accent: col('--accent', '#B57BFF') };
    const D = Math.PI / 180, ctx = canvas.getContext('2d');
    const vec = (lon, lat) => [Math.cos(lat * D) * Math.cos(lon * D), Math.cos(lat * D) * Math.sin(lon * D), Math.sin(lat * D)];
    const land = []; for (let i = 0; i < tour.land.length; i += 2) land.push(vec(tour.land[i] / 10, tour.land[i + 1] / 10));
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const slerp = (a, b, s) => { const w = Math.acos(Math.min(1, Math.max(-1, dot(a, b)))); if (w < 1e-6) return a.slice(); const k1 = Math.sin((1 - s) * w) / Math.sin(w), k2 = Math.sin(s * w) / Math.sin(w); return [a[0] * k1 + b[0] * k2, a[1] * k1 + b[1] * k2, a[2] * k1 + b[2] * k2]; };
    const toLL = (p) => [Math.atan2(p[1], p[0]) / D, Math.asin(Math.max(-1, Math.min(1, p[2] / Math.hypot(...p)))) / D];
    const basis = (lon, lat) => { const l = lon * D, f = lat * D; return { e: [-Math.sin(l), Math.cos(l), 0], n: [-Math.sin(f) * Math.cos(l), -Math.sin(f) * Math.sin(l), Math.cos(f)], c: [Math.cos(f) * Math.cos(l), Math.cos(f) * Math.sin(l), Math.sin(f)] }; };
    const view = (p, B) => [dot(p, B.e), dot(p, B.n), dot(p, B.c)];
    const arcPt = (a, b, u) => { const w = Math.acos(Math.min(1, dot(a, b))), h = 0.12 + 0.5 * w / Math.PI, p = slerp(a, b, u), k = 1 + h * Math.sin(Math.PI * u); return [p[0] * k, p[1] * k, p[2] * k]; };
    const g = { C, vec, slerp, toLL, cross: (a, b) => { const c = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], l = Math.hypot(...c) || 1; return [c[0] / l, c[1] / l, c[2] / l]; }, angle: (a, b) => Math.acos(Math.min(1, dot(a, b))), dist: (a, b) => Math.acos(Math.min(1, dot(a, b))) * 6371,
      screen(lon, lat, st) { const B = basis(st.lon, st.lat), v = view(vec(lon, lat), B); return { x: st.cx + st.R * v[0], y: st.cy - st.R * v[1], vis: v[2] > 0.05 }; },
      draw(st) {
        const B = basis(st.lon, st.lat), R = st.R, cx = st.cx, cy = st.cy;
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.globalAlpha = 1;
        ctx.fillStyle = C.second; ctx.globalAlpha = 0.035; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill();
        ctx.globalAlpha = 0.28; ctx.strokeStyle = C.second; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.globalAlpha = 0.08; ctx.lineWidth = 1;
        const line = (pts) => { let on = false; ctx.beginPath(); pts.forEach((p) => { const v = view(p, B); if (v[2] > 0) { const x = cx + R * v[0], y = cy - R * v[1]; on ? ctx.lineTo(x, y) : ctx.moveTo(x, y); on = true; } else on = false; }); ctx.stroke(); };
        for (let la = -60; la <= 60; la += 30) { const ps = []; for (let lo = -180; lo <= 180; lo += 4) ps.push(vec(lo, la)); line(ps); }
        for (let lo = -180; lo < 180; lo += 30) { const ps = []; for (let la = -86; la <= 86; la += 4) ps.push(vec(lo, la)); line(ps); }
        ctx.fillStyle = C.second; const s0 = R / 420;
        for (const p of land) { const z = dot(p, B.c); if (z <= 0) continue; const x = cx + R * dot(p, B.e), y = cy - R * dot(p, B.n), r = (1.4 + 1.6 * z) * s0; ctx.globalAlpha = (0.18 + 0.5 * z) * (st.landAlpha ?? 1); ctx.fillRect(x - r, y - r, r * 2, r * 2); }
        (st.arcs || []).forEach((a) => {
          const A = vec(...a.a), Bv = vec(...a.b), n = 72, m = Math.max(1, Math.round(n * a.s)); if (a.s <= 0) return;
          ctx.strokeStyle = C.main; ctx.lineWidth = a.w || 3; ctx.lineCap = 'round';
          let prev = null;
          for (let i = 0; i <= m; i++) { const u = (i / n) > a.s ? a.s : i / n, v = view(arcPt(A, Bv, u), B), vis = v[2] > 0 || v[0] * v[0] + v[1] * v[1] > 1, pt = [cx + R * v[0], cy - R * v[1]];
            if (prev && vis) { const al = (a.alpha ?? 1) * (0.4 + 0.6 * (i / m)); ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(pt[0], pt[1]); ctx.lineWidth = (a.w || 3) * 2.6; ctx.globalAlpha = al * 0.22; ctx.stroke(); ctx.lineWidth = a.w || 3; ctx.globalAlpha = al; ctx.stroke(); }
            prev = vis ? pt : null; }
          if (a.plane && a.s < 1) { const v1 = view(arcPt(A, Bv, a.s), B), v0 = view(arcPt(A, Bv, Math.max(0, a.s - 0.01)), B), x = cx + R * v1[0], y = cy - R * v1[1], ang = Math.atan2(-(v1[1] - v0[1]), v1[0] - v0[0]);
            ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.globalAlpha = 1; ctx.fillStyle = C.second; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-10, -9); ctx.lineTo(-5, 0); ctx.lineTo(-10, 9); ctx.closePath(); ctx.fill(); ctx.restore(); }
        });
        (st.marks || []).forEach((mk) => { const v = view(vec(...mk.p), B); if (v[2] <= 0.02) return; const x = cx + R * v[0], y = cy - R * v[1];
          ctx.globalAlpha = mk.alpha ?? 1; ctx.fillStyle = mk.now ? C.second : C.main; ctx.beginPath(); ctx.arc(x, y, mk.now ? 8 : 6, 0, 7); ctx.fill();
          if (mk.now) { const q = mk.pulse || 0; ctx.strokeStyle = C.main; ctx.lineWidth = 3; ctx.globalAlpha = 1 - q; ctx.beginPath(); ctx.arc(x, y, 10 + 26 * q, 0, 7); ctx.stroke(); } });
        ctx.globalAlpha = 1;
      } };
    return g;
  },
  timeline(tour, DW) {
    const D = Math.PI / 180, v = (s) => [Math.cos(s.lat * D) * Math.cos(s.lon * D), Math.cos(s.lat * D) * Math.sin(s.lon * D), Math.sin(s.lat * D)];
    const S = tour.stops, fs = [0], fe = [0], F = [0], km = [0];
    let t = DW;
    for (let i = 1; i < S.length; i++) {
      const a = v(S[i - 1]), b = v(S[i]), d = Math.acos(Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])) * 6371;
      F[i] = Math.round((1.6 + d / 2600) * 10) / 10; km[i] = d; fs[i] = t; fe[i] = t + F[i]; t = fe[i] + DW;
    }
    return { fs, fe, F, km, end: Math.round(t * 10) / 10 };
  },
};

/* World tour: circuit to circuit on a 3D globe, with each round's league podium.
   Scenes 'opener', 'tour' and 'finale', played by assets/js/films.js; GLOBE draws the globe. */
(function (kit) {
const { seg, eo, ei, eio, lerp, TextFx } = kit;
kit.scene('opener', {
  init(kit) {
    this.tour = kit.json('tour.json');
    kit.stage.append(kit.h('<div class="ground"><div class="stripe"></div><canvas class="globe" width="1920" height="1080"></canvas>' +
      '<div class="words opener-words" style="left:120px;top:330px;width:860px"><p class="eyebrow">aston martpx F1 Fantasy · 2026</p>' +
      '<h1 class="line opener-title">Around the world in ' + kit.esc(this.tour.season.words) + ' rounds</h1>' +
      '<p class="sub opener-sub">League podiums, race by race, from ' + kit.esc(this.tour.stops[0].city) + ' to ' + kit.esc(this.tour.stops[this.tour.stops.length - 1].city) + '</p></div></div>'));
    this.g = window.GLOBE.make(kit, this.tour, kit.stage.querySelector('.globe'));
    this.words = kit.stage.querySelector('.opener-words').style;
    this.title = kit.stage.querySelector('.opener-title');
    this.sub = kit.stage.querySelector('.opener-sub').style;
    const s = this.tour.stops[0];
    this.end = [s.lon, s.lat];
  },
  render(t) {
    const m = eio(seg(t, 1.6, 4));
    const spin = eo(seg(t, -1, 4));
    this.g.draw({
      lon: lerp(10, this.end[0], spin), lat: lerp(18, this.end[1], spin),
      R: lerp(340, 720, m), cx: lerp(1330, 690, m), cy: 560,
      landAlpha: eo(seg(t, -0.6, 0.6)),
      marks: [{ p: this.end, now: true, pulse: (t * 0.6) % 1, alpha: eo(seg(t, 3.3, 3.8)) }],
    });
    TextFx.fadeFromRight(this.title, t, -0.6, { dx: 30 });
    this.sub.opacity = eo(seg(t, 0.5, 1.1));
    this.sub.transform = 'translateX(' + lerp(26, 0, eo(seg(t, 0.5, 1.1))) + 'px)';
    const out = ei(seg(t, 2.4, 3.2));
    this.words.opacity = 1 - out;
    this.words.transform = 'translateX(' + (lerp(0, -40, out) - 2 * t) + 'px)';
  },
});

})(window.FILMKIT.film("tour"));
(function (kit) {
const { seg, eo, ei, lerp, clamp01 } = kit;
const DW = 6.6, CX = 690, CY = 560, RIN = 720, RZ = 1500;
const TL = { fs: [], fe: [], end: 0 };
const fs = (i) => TL.fs[i], fe = (i) => TL.fe[i];
const sm = (x) => { x = clamp01(x); return x * x * x * (x * (6 * x - 15) + 10); };
const OFF0 = 0.3, OFFB = 0.25;
const POD = '<div class="podium"><div class="ps p2"><span class="team"></span><b></b><i>P2</i></div><div class="ps p1"><span class="team"></span><b></b><i>P1</i></div><div class="ps p3"><span class="team"></span><b></b><i>P3</i></div></div>';
kit.scene('tour', {
  init(kit) {
    const T = this.T = kit.json('tour.json'), S = T.stops, TK = kit.json('tracks.json').tracks;
    let ticks = '';
    S.forEach(() => { ticks += '<i></i>'; });
    kit.css('.tour-ticks{position:absolute;left:64px;bottom:60px;display:flex;gap:8px}.tour-ticks i{width:44px;height:6px;border-radius:3px;background:color-mix(in srgb, var(--second) 16%, transparent)}.tour-ticks i.on{background:var(--main)}' +
      '.tour-note{font-family:var(--mono, ui-monospace, monospace);font-size:22px;color:var(--accent)}.tour-hud b{font-family:var(--mono, ui-monospace, monospace);font-size:30px;font-weight:700}.tour-card{left:1260px;width:600px}');
    kit.stage.append(kit.h('<div class="ground"><div class="stripe"></div><canvas class="globe tour-g" width="1920" height="1080"></canvas><canvas class="globe tour-t" width="1920" height="1080"></canvas>' +
      '<div class="hud tour-hud"><span class="eyebrow">World tour · aston martpx F1 Fantasy 2026</span><b class="tour-leg"></b></div>' +
      '<span class="pin tour-pin"></span><div class="tour-ticks">' + ticks + '</div>' +
      '<div class="card tour-card"><span class="eyebrow tour-eye"></span><h2 class="tour-gp"></h2><p class="sub tour-sub" style="margin:0"></p>' +
      '<span class="tour-note"></span>' + POD + '<span class="foot tour-foot"></span></div></div>'));
    Object.assign(TL, window.GLOBE.timeline(T, DW));
    const q = (s) => kit.stage.querySelector(s);
    const g = this.g = window.GLOBE.make(kit, T, q('.tour-g'));
    this.gc = q('.tour-g').style; this.tc = q('.tour-t').style;
    const ctx = q('.tour-t').getContext('2d'), C = g.C, mono = kit.fonts.mono || 'monospace';
    this.track = S.map((s) => TK[s.code] || null);
    this.drawTrack = (tr, o) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, 1920, 1080);
      if (!tr || o.alpha <= 0) return;
      const pts = tr.pts, n = pts.length / 2, cyw = Math.cos(o.yaw), syw = Math.sin(o.yaw), cp = Math.cos(o.pitch), sp = Math.sin(o.pitch), k = o.S / 420;
      const P = (x, y, h) => { const X = x * cyw - y * syw, Y = x * syw + y * cyw, f = 1 / (1 + Y * sp * 0.35); return [o.cx + X * o.S * f, o.cy - Y * cp * o.S * f - h * k * f, Y]; };
      const at = (j, h) => P(pts[2 * (j % n)], pts[2 * (j % n) + 1], h);
      const m = Math.max(2, Math.round(n * o.reveal)), H = 16;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = C.second; ctx.lineWidth = 1;
      for (let v = -1.4; v <= 1.401; v += 0.2) {
        for (const [a, b] of [[P(v, -1.1, 0), P(v, 1.1, 0)], [P(-1.4, v * 0.8, 0), P(1.4, v * 0.8, 0)]]) { ctx.globalAlpha = 0.07 * o.alpha; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
      }
      const poly = (h, from, to) => { ctx.beginPath(); for (let j = from; j <= to; j++) { const p = at(j, h); j === from ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]); } ctx.stroke(); };
      ctx.globalAlpha = 0.45 * o.alpha; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 22 * k; poly(0, 0, m);
      const segs = []; for (let j = 0; j < m; j++) segs.push(j);
      segs.sort((a, b) => at(b, 0)[2] - at(a, 0)[2]);
      ctx.fillStyle = C.main;
      for (const j of segs) { const a0 = at(j, 0), b0 = at(j + 1, 0), a1 = at(j, H), b1 = at(j + 1, H); ctx.globalAlpha = 0.5 * o.alpha; ctx.beginPath(); ctx.moveTo(a0[0], a0[1]); ctx.lineTo(b0[0], b0[1]); ctx.lineTo(b1[0], b1[1]); ctx.lineTo(a1[0], a1[1]); ctx.closePath(); ctx.fill(); }
      ctx.strokeStyle = C.second; ctx.globalAlpha = 0.28 * o.alpha; ctx.lineWidth = 18 * k; poly(H, 0, m);
      ctx.globalAlpha = 0.9 * o.alpha; ctx.lineWidth = 6 * k; poly(H, 0, m);
      const s0 = at(0, H), top = at(0, H + 60);
      ctx.globalAlpha = o.alpha; ctx.strokeStyle = C.second; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(s0[0], s0[1]); ctx.lineTo(top[0], top[1]); ctx.stroke();
      for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) { ctx.fillStyle = (r + c) % 2 ? C.second : 'rgba(0,0,0,.6)'; ctx.fillRect(top[0] + c * 8, top[1] + r * 8, 8, 8); }
      if (o.car >= 0) (o.cars || [C.second]).forEach((col, ci) => {
        let u = (o.car - ci * 0.035 + 1) % 1; u *= n; const j = Math.floor(u), a = at(j, H), b = at(j + 1, H), f = u - j, x = lerp(a[0], b[0], f), y = lerp(a[1], b[1], f);
        ctx.globalAlpha = o.alpha * 0.85; ctx.strokeStyle = col; ctx.lineWidth = 7 * k; ctx.beginPath(); for (let q = Math.max(0, j - 7); q <= j; q++) { const p = at(q, H); q === Math.max(0, j - 7) ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]); } ctx.lineTo(x, y); ctx.stroke();
        ctx.globalAlpha = o.alpha; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, 10, 0, 7); ctx.fill();
        ctx.strokeStyle = C.second; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, 10, 0, 7); ctx.stroke();
      });
      ctx.globalAlpha = 1;
    };
    this.V = S.map((s) => g.vec(s.lon, s.lat));
    this.legs = TL.km.map((d) => Math.round(d));
    this.ang = S.map((s, i) => (i ? g.angle(this.V[i - 1], this.V[i]) : 0));
    this.nrm = S.map((s, i) => (i ? g.cross(this.V[i - 1], this.V[i]) : [0, 0, 1]));
    this.el = { card: q('.tour-card').style, eye: q('.tour-eye'), gp: q('.tour-gp'), sub: q('.tour-sub'), note: q('.tour-note'), foot: q('.tour-foot'), pin: q('.tour-pin'), leg: q('.tour-leg'), pod: q('.podium').style };
    this.steps = ['.p1', '.p2', '.p3'].map((c) => { const e = q('.tour-card ' + c); return { e: e.style, team: e.querySelector('.team'), pts: e.querySelector('b'), blk: e.querySelector('i') }; });
    this.ticks = [...kit.stage.querySelectorAll('.tour-ticks i')];
    this.shown = -1;
    this.fill = (k) => {
      if (this.shown === k) return; this.shown = k;
      const s = S[k], e = this.el;
      e.eye.textContent = 'Round ' + s.r + ' · ' + s.date;
      e.gp.textContent = s.gp;
      e.sub.textContent = s.circuit + ' · ' + s.country;
      e.note.textContent = s.note;
      e.pin.textContent = s.code + ' · ' + s.city;
      e.pod.display = s.podium ? 'grid' : 'none';
      (s.podium || []).forEach((p, i) => { const st = this.steps[i]; st.team.textContent = p.team; st.pts.textContent = p.pts.toLocaleString('en-GB'); st.pts.style.color = i === 0 ? 'var(--accent)' : ''; st.blk.style.color = p.color; });
      e.foot.textContent = s.leader ? 'Leader after round · ' + s.leader.team + ' · ' + s.leader.cum.toLocaleString('en-GB') : 'League podium shown with round 2';
      this.ticks.forEach((tk, j) => tk.classList.toggle('on', j <= k));
    };
  },
  render(t) {
    const S = this.T.stops, n = S.length, g = this.g, V = this.V;
    let i = 0; for (let j = 1; j < n; j++) if (t >= fs(j)) i = j;
    const arrived = !i || t >= fe(i), k = arrived ? i : i - 1;
    const ta = k ? fe(k) : 0, last = k === n - 1, tl = last ? TL.end : fs(k + 1);
    const legC = (L, pc) => { const nv = this.nrm[L], off = OFF0 + OFFB * Math.min(1, this.ang[L] / 0.9) * Math.sin(Math.PI * pc), b = g.slerp(V[L - 1], V[L], pc); const c = [b[0] + nv[0] * off, b[1] + nv[1] * off, b[2] + nv[2] * off], l = Math.hypot(...c); return [c[0] / l, c[1] / l, c[2] / l]; };
    let cam, L = 0;
    for (let j = 1; j < n; j++) if (t >= fs(j) - 0.4 && t < fe(j) + 0.4) L = j;
    if (L) cam = legC(L, sm(seg(t, fs(L) - 0.4, fe(L) + 0.4)));
    else {
      let d = 0; for (let j = 0; j < n; j++) if (t >= (j ? fe(j) + 0.4 : 0)) d = j;
      const dl = d === n - 1, from = d ? legC(d, 1) : V[0], to = dl ? V[d] : legC(d + 1, 0);
      cam = g.slerp(from, to, sm(seg(t, d ? fe(d) + 0.4 : 0, dl ? TL.end - 0.2 : fs(d + 1) - 0.4)));
    }
    const [lon, lat] = g.toLL(cam);
    let Rf = RIN;
    if (L) { const u = seg(t, fs(L) - 0.4, fe(L) + 0.4); Rf = lerp(RIN, lerp(640, 470, clamp01(this.ang[L] / 1.3)), (1 - Math.cos(2 * Math.PI * u)) / 2); }
    const zs = (j) => { const a0 = j ? fe(j) : 0, l0 = j === n - 1 ? TL.end : fs(j + 1); return (j ? sm(seg(t, a0 - 0.5, a0 + 1.5)) : sm(seg(t, 0.1, 1.7))) * (1 - sm(j === n - 1 ? seg(t, l0 - 2.0, l0 - 0.1) : seg(t, l0 - 1.4, l0 + 0.5))); };
    let z = 0, kz = k; for (let j = 0; j < n; j++) { const v = zs(j); if (v > z) { z = v; kz = j; } }
    const st = { lon, lat, cx: CX, cy: CY, R: lerp(Rf, RZ, z) };
    const p = i ? sm(seg(t, fs(i), fe(i))) : 1;
    st.arcs = []; for (let j = 1; j <= i; j++) st.arcs.push({ a: [S[j - 1].lon, S[j - 1].lat], b: [S[j].lon, S[j].lat], s: j < i ? 1 : p, plane: j === i, alpha: j < i ? 0.5 : 1, w: j < i ? 4 : 7 });
    st.marks = []; for (let j = 0; j <= i; j++) if (j < i || arrived) st.marks.push({ p: [S[j].lon, S[j].lat], now: j === k && arrived, pulse: ((t - ta) * 0.6) % 1 });
    const gOp = 1 - sm(seg(z, 0.4, 0.9));
    this.gc.opacity = gOp;
    if (gOp > 0.001) g.draw(st);
    const sp = g.screen(S[kz].lon, S[kz].lat, st), tk = kz ? fe(kz) : 0;
    const tz = seg(z, 0.3, 1), tOp = sm(seg(z, 0.45, 1));
    this.tc.opacity = tOp;
    const pod = S[kz].podium;
    this.drawTrack(this.track[kz], { cx: lerp(sp.x, CX, sm(tz)), cy: lerp(sp.y, CY + 30, sm(tz)), S: lerp(60, 390, sm(tz)), yaw: -0.45 + 0.05 * (t - tk), pitch: 1.0, alpha: tOp,
      reveal: sm(seg(t, tk + 0.2, tk + 2.2)), car: tOp > 0.05 ? (((t - tk) * 0.1) % 1 + 1) % 1 : -1, cars: pod ? pod.map((q) => q.color) : null });
    this.fill(k);
    const vis = eo(seg(t, ta + 0.9, ta + 1.4)) * (1 - ei(seg(t, tl - 1.7, tl - 1.2)));
    this.el.card.opacity = vis;
    this.el.card.transform = 'translateX(' + lerp(30, 0, eo(seg(t, ta + 0.9, ta + 1.5))) + 'px)';
    [1, 0, 2].forEach((si, o) => { const a = ta + 1.2 + o * 0.18, s2 = this.steps[si]; s2.blk.style.transform = 'scaleY(' + lerp(0.2, 1, eo(seg(t, a, a + 0.45))) + ')'; s2.e.opacity = eo(seg(t, a, a + 0.3)); });
    this.el.pin.style.opacity = (arrived && sp.vis ? 1 : 0) * (1 - seg(z, 0, 0.3)) * eo(seg(t, ta - 0.1, ta + 0.2));
    this.el.pin.style.transform = 'translate(' + (sp.x + 20) + 'px,' + (sp.y - 62) + 'px)';
    const tr = this.track[kz];
    this.el.leg.textContent = z > 0.5 && tr ? 'Circuit · ' + S[kz].circuit + ' · ' + (tr.km / 1000).toFixed(3) + ' km'
      : i ? 'Flight ' + String(i).padStart(2, '0') + ' · ' + S[i - 1].code + ' → ' + S[i].code + ' · ' + this.legs[i].toLocaleString('en-GB') + ' km' : 'Grid · ' + S[0].city;
  },
});

})(window.FILMKIT.film("tour"));
(function (kit) {
const { seg, eo, eio, lerp } = kit;
const POD = '<div class="podium"><div class="ps p2"><span class="team"></span><b></b><i>P2</i></div><div class="ps p1"><span class="team"></span><b></b><i>P1</i></div><div class="ps p3"><span class="team"></span><b></b><i>P3</i></div></div>';
kit.scene('finale', {
  init(kit) {
    const T = this.T = kit.json('tour.json'), S = T.stops, last = S[S.length - 1];
    kit.stage.append(kit.h('<div class="ground"><div class="stripe"></div><canvas class="globe" width="1920" height="1080"></canvas>' +
      '<div class="hud"><span class="eyebrow">World tour · aston martpx F1 Fantasy 2026</span><b class="mono finale-leg" style="font-size:30px"></b></div>' +
      '<div class="card finale-card" style="left:1260px"><span class="eyebrow finale-eye"></span><h2 class="finale-gp"></h2><p class="sub finale-sub" style="margin:0"></p>' +
      POD + '<span class="foot finale-foot"></span></div></div>'));
    this.g = window.GLOBE.make(kit, T, kit.stage.querySelector('.globe'));
    const q = (s) => kit.stage.querySelector(s);
    this.e = { card: q('.finale-card').style, eye: q('.finale-eye'), gp: q('.finale-gp'), sub: q('.finale-sub'), foot: q('.finale-foot'), leg: q('.finale-leg') };
    this.rows = ['.p1', '.p2', '.p3'].map((c) => { const e = q('.finale-card ' + c); return { e: e.style, blk: e.querySelector('i'), team: e.querySelector('.team'), pts: e.querySelector('b') }; });
    let km = 0; for (let i = 1; i < S.length; i++) km += this.g.dist(this.g.vec(S[i - 1].lon, S[i - 1].lat), this.g.vec(S[i].lon, S[i].lat));
    const F = T.final;
    this.A = { eye: 'Round ' + last.r + ' · ' + last.date, gp: last.gp, sub: last.circuit + ' · ' + last.country, rows: last.podium.map((p) => [p.color, p.team, p.pts]), foot: 'Leader after round · ' + last.leader.team + ' · ' + last.leader.cum.toLocaleString('en-GB'), first: true };
    this.B = { eye: 'Standings after round ' + last.r, gp: F[0].team + ' leads', sub: (F[0].cum - F[1].cum).toLocaleString('en-GB') + ' points clear of ' + F[1].team, rows: F.map((p) => [p.color, p.team, p.cum]), foot: T.season.line, first: false };
    this.km = Math.round(km).toLocaleString('en-GB');
    this.end = this.g.vec(last.lon, last.lat);
    this.wide = this.g.vec(60, 18);
    this.side = null;
  },
  render(t) {
    const S = this.T.stops, z = eio(seg(t, 0.2, 2.6));
    const c = this.g.toLL(this.g.slerp(this.end, this.wide, z));
    const arcs = []; for (let j = 1; j < S.length; j++) arcs.push({ a: [S[j - 1].lon, S[j - 1].lat], b: [S[j].lon, S[j].lat], s: 1, alpha: lerp(0.5, 0.9, z), w: 4.5 });
    const marks = S.map((s, j) => ({ p: [s.lon, s.lat], now: j === S.length - 1, pulse: (t * 0.6) % 1 }));
    this.g.draw({ lon: c[0] + 4 * t * 0.2, lat: c[1], cx: lerp(690, 680, z), cy: 560, R: lerp(720, 360, z) * (1 + 0.006 * Math.sin(t * 2.1)), arcs, marks });
    const p = seg(t, 0.4, 1.1), side = p < 0.5 ? this.A : this.B;
    if (this.side !== side) {
      this.side = side; const e = this.e;
      e.eye.textContent = side.eye; e.gp.textContent = side.gp; e.sub.textContent = side.sub; e.foot.textContent = side.foot;
      side.rows.forEach((r, i) => { const w = this.rows[i]; w.blk.style.color = r[0]; w.team.textContent = r[1]; w.pts.textContent = r[2].toLocaleString('en-GB'); w.pts.style.color = side.first && i === 0 ? 'var(--accent)' : ''; });
    }
    this.e.card.opacity = Math.abs(p - 0.5) * 2;
    this.e.card.transform = 'translateX(' + (p < 0.5 ? 0 : lerp(30, 0, eo(seg(t, 0.75, 1.3)))) + 'px)';
    [1, 0, 2].forEach((si, o) => { const a = 0.75 + o * 0.18, r = this.rows[si]; r.blk.style.transform = 'scaleY(' + (p < 0.5 ? 1 : lerp(0.2, 1, eo(seg(t, a, a + 0.45)))) + ')'; });
    this.e.leg.textContent = S.length + ' rounds \u00b7 ' + (S.length - 1) + ' flights \u00b7 ' + this.km + ' km';
  },
});

})(window.FILMKIT.film("tour"));