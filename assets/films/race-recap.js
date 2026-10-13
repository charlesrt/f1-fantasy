/* Race recap: one round's league podium rising, then the championship reshuffling.
   Square 1080 × 1080 stage; data comes from films.js (recap.json) for the chosen round. */
(function (kit) {
  const { seg, eo, eio, eob, lerp, esc } = kit;
  const nf = new Intl.NumberFormat('en-GB');
  const CAR = '<svg viewBox="0 0 120 40" width="150" height="50" aria-hidden="true" focusable="false"><rect x="0" y="5" width="12" height="30" rx="2" fill="currentColor" opacity=".75"/><rect x="16" y="0" width="20" height="10" rx="3" fill="#15181C"/><rect x="16" y="30" width="20" height="10" rx="3" fill="#15181C"/><path d="M10 16 H30 L44 9 H70 L82 14 H104 L112 18 V22 L104 26 H82 L70 31 H44 L30 24 H10 Z" fill="currentColor"/><rect x="80" y="2" width="16" height="9" rx="3" fill="#15181C"/><rect x="80" y="29" width="16" height="9" rx="3" fill="#15181C"/><rect x="106" y="6" width="8" height="28" rx="2" fill="currentColor" opacity=".75"/><ellipse cx="58" cy="20" rx="9" ry="5" fill="#15181C"/></svg>';

  kit.baseCss = [
    '#stage { --ground:#0A0C0F; --main:#FF3B30; --second:#F2F4F7; --accent:#B57BFF; --green:#2FD67B; --yellow:#FFD23F; --faint:#7D8794; color:var(--second); font-family:var(--sans) }',
    '.ground { position:absolute; inset:0; background:var(--ground); overflow:hidden }',
    '.ground::before { content:""; position:absolute; inset:0; background-image:linear-gradient(color-mix(in srgb, var(--second) 5%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--second) 5%, transparent) 1px, transparent 1px); background-size:60px 60px }',
    '.stripe { position:absolute; left:0; right:0; top:0; height:8px; background:linear-gradient(90deg, var(--main) 0 38%, transparent 38% 40%, var(--main) 40% 42%, transparent 42% 44%, var(--main) 44% 45%, transparent 45%) }',
    '.words { position:absolute; left:60px; top:64px; width:960px; margin:0; display:flex; flex-direction:column; gap:14px }',
    '.words > * { margin:0 }',
    '.eyebrow { font-family:var(--mono); font-size:24px; letter-spacing:.22em; text-transform:uppercase; color:color-mix(in srgb, var(--second) 68%, var(--ground)); margin:0 }',
    '.line { font-family:var(--display); font-size:76px; line-height:1.02; font-weight:900; letter-spacing:-0.01em; margin:0 }',
    '.sub { font-size:34px; color:color-mix(in srgb, var(--second) 72%, var(--ground)) }',
    '.tag { font-family:var(--mono); font-size:22px; font-weight:700; letter-spacing:.08em; padding:6px 12px; border-radius:6px; background:#D92B21; color:var(--second) }',
  ].join('\n');

  kit.scene('result', {
    init(k) {
      const D = k.json('recap.json'), top = D.results.slice(0, 3), H = [260, 190, 140], X = [390, 80, 700];
      k.css('.rr-gp { display:flex; align-items:center; gap:18px }' +
        '.rr-pod { position:absolute; bottom:0; width:300px; display:grid; justify-items:center; gap:10px }' +
        '.rr-car { display:block; height:50px; margin:50px 0 44px; transform:rotate(-90deg) }' +
        '.rr-team { font-size:28px; font-weight:600; text-align:center; line-height:1.1; width:280px; color:var(--second) }' +
        '.rr-pts { font-family:var(--mono); font-size:44px; font-weight:700; font-variant-numeric:tabular-nums }' +
        '.rr-blk { width:300px; border-radius:12px 12px 0 0; display:flex; justify-content:center; padding-top:16px; font-family:var(--mono); font-size:52px; font-weight:700; background:color-mix(in srgb, var(--ground) 86%, var(--second)); border-top:6px solid currentColor }' +
        '.rr-blk span { color:var(--second) }');
      let pods = '';
      top.forEach((tm, i) => {
        pods += '<div class="rr-pod" style="left:' + X[i] + 'px;color:' + tm.color + '"><span class="rr-car">' + CAR + '</span>' +
          '<span class="rr-team">' + esc(tm.team) + '</span><span class="rr-pts" style="color:' + (i ? 'var(--second)' : 'var(--accent)') + '"></span>' +
          '<div class="rr-blk" style="height:' + H[i] + 'px"><span>P' + (i + 1) + '</span></div></div>';
      });
      k.stage.append(k.h('<div class="ground"><div class="stripe"></div>' +
        '<div class="words"><p class="eyebrow">aston martpx F1 Fantasy · Race recap</p>' +
        '<div class="rr-gp"><span class="tag">R' + D.r + '</span><p class="line rr-title">' + esc(D.gp) + '</p></div>' +
        '<p class="sub rr-sub">' + esc([D.circuit, D.date, D.combined ? 'two races, scored together' : 'league race podium'].filter(Boolean).join(' · ')) + '</p></div>' + pods + '</div>'));
      const q = (s) => k.stage.querySelector(s);
      this.title = q('.rr-title').style; this.sub = q('.rr-sub').style;
      this.pods = [...k.stage.querySelectorAll('.rr-pod')].map((el, i) => ({ s: el.style, pts: el.querySelector('.rr-pts'), v: top[i].pts }));
    },
    render(t) {
      const ft = eo(seg(t, 0, 0.6)), fs = eo(seg(t, 0.3, 0.8));
      this.title.opacity = ft; this.title.transform = 'translateX(' + lerp(28, 0, ft) + 'px)';
      this.sub.opacity = fs; this.sub.transform = 'translateX(' + lerp(24, 0, fs) + 'px)';
      const at = [1.6, 1.3, 1.0];
      this.pods.forEach((p, i) => {
        const a = at[i];
        p.s.transform = 'translateY(' + lerp(560, 0, eob(seg(t, a, a + 0.7), 1.5)) + 'px)';
        p.s.opacity = eo(seg(t, a, a + 0.2));
        p.pts.textContent = nf.format(Math.round(lerp(p.v * 0.5, p.v, eo(seg(t, a + 0.1, a + 1.2))))) + ' pts';
      });
    },
  });

  const M0 = 1.3, M1 = 3.0, TOP = 250;
  kit.scene('standings', {
    init(k) {
      const D = k.json('recap.json');
      this.ROW = Math.min(66, Math.floor(700 / Math.max(1, D.standings.length)));
      k.css('.rs-row { position:absolute; left:44px; right:44px; top:0; height:' + (this.ROW - 8) + 'px; display:grid; grid-template-columns:76px 8px 1fr 120px 76px 150px; align-items:center; gap:16px; padding:0 16px; border-radius:10px }' +
        '.rs-row.p1 { background:color-mix(in srgb, var(--ground) 88%, var(--second)) }' +
        '.rs-row i { width:8px; height:34px; border-radius:4px }' +
        '.rs-pos { font-family:var(--mono); font-weight:700; font-size:30px }' +
        '.rs-team { font-size:28px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis }' +
        '.rs-d { font-family:var(--mono); font-size:24px; text-align:right; color:color-mix(in srgb, var(--second) 70%, var(--ground)) }' +
        '.rs-mv { font-family:var(--mono); font-size:22px; text-align:center }' +
        '.rs-tot { font-family:var(--mono); font-size:30px; font-weight:700; text-align:right; font-variant-numeric:tabular-nums }' +
        '.rs-foot { position:absolute; left:60px; bottom:44px }');
      let rows = '';
      D.standings.forEach((s) => {
        rows += '<div class="rs-row"><span class="rs-pos"></span><i style="background:' + s.color + '"></i><span class="rs-team">' + esc(s.team) + '</span>' +
          '<span class="rs-d">' + (s.pts ? '+' + nf.format(s.pts) : '') + '</span><span class="rs-mv"></span><span class="rs-tot"></span></div>';
      });
      k.stage.append(k.h('<div class="ground"><div class="stripe"></div>' +
        '<div class="words"><p class="eyebrow">Standings after R' + D.r + ' · ' + esc(D.gp) + '</p><p class="line rs-title">Championship</p></div>' + rows +
        '<p class="eyebrow rs-foot">Full telemetry on the league dashboard</p></div>'));
      this.title = k.stage.querySelector('.rs-title').style;
      this.foot = k.stage.querySelector('.rs-foot').style;
      this.rows = [...k.stage.querySelectorAll('.rs-row')].map((el, i) => {
        const x = D.standings[i], g = x.prevRank - x.rank, mv = el.querySelector('.rs-mv');
        // movement is fixed for the round: ▲ gained, ▼ lost, • held
        mv.textContent = x.isNew ? 'NEW' : g > 0 ? '▲' + g : g < 0 ? '▼' + -g : '•';
        mv.style.color = g > 0 || x.isNew ? 'var(--green)' : g < 0 ? 'var(--yellow)' : 'var(--faint)';
        return { el, s: el.style, pos: el.querySelector('.rs-pos'), d: el.querySelector('.rs-d').style, mv: mv.style, tot: el.querySelector('.rs-tot'), x };
      });
    },
    render(t) {
      const ft = eo(seg(t, 0, 0.6)), p = eio(seg(t, M0, M1));
      this.title.opacity = ft; this.title.transform = 'translateX(' + lerp(28, 0, ft) + 'px)';
      this.rows.forEach((r, i) => {
        const s = r.x, rk = lerp(s.prevRank, s.rank, p), a = 0.15 + i * 0.05;
        r.s.transform = 'translateY(' + (TOP + rk * this.ROW + lerp(20, 0, eo(seg(t, a, a + 0.4)))) + 'px)';
        r.s.opacity = eo(seg(t, a, a + 0.3));
        r.el.classList.toggle('p1', Math.round(rk) === 0);
        r.pos.textContent = 'P' + (Math.round(rk) + 1);
        r.tot.textContent = nf.format(Math.round(lerp(s.prev, s.now, p)));
        r.d.opacity = eo(seg(t, 0.8, 1.2)) * (1 - 0.5 * eo(seg(t, M1, M1 + 0.5)));
        r.mv.opacity = eo(seg(t, M1 - 0.1, M1 + 0.3));
      });
      this.foot.opacity = eo(seg(t, M1 + 0.4, M1 + 0.9)) * 0.9;
    },
  });
})(window.FILMKIT.film('recap'));
