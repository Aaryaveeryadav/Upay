/* ============================================================
   Upay — figures
   Every answer gets a diagram drawn from its own numbers.
   Pure inline SVG: no images, no libraries, prints cleanly.
   ============================================================ */
window.UP = window.UP || {};

UP.figures = (function () {
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const C = {
    sky: '#46a0c9', skySoft: '#e2f2fb', skyMid: '#9bd2ee', skyDeep: '#2f7fa3',
    cream: '#f7efd8', creamMid: '#ecdfb9', creamDeep: '#b79a4a',
    ink: '#4a4f55', inkSoft: '#8d949c', line: '#d9dee3', white: '#ffffff',
    green: '#5f8a5a', red: '#c0685c', violet: '#7c6aa8'
  };

  const num = (v) => (typeof v === 'number' && isFinite(v)) ? Number(v.toFixed(2)) : 0;
  /* two stacked <text> nodes: a white outline behind, the coloured fill in front.
     Paint-order is avoided because some renderers ignore it and hide the glyphs. */
  const label = (x, y, text, o) => {
    o = o || {};
    const font = `font-size="${o.size || 11.5}" text-anchor="${o.anchor || 'middle'}" font-weight="${o.weight || 500}"` +
      (o.mono ? ' font-family="ui-monospace,SFMono-Regular,Menlo,monospace"' : '');
    const body = esc(text);
    const halo = o.halo === false ? '' :
      `<text x="${num(x)}" y="${num(y)}" ${font} fill="none" stroke="${o.haloFill || '#ffffff'}"
        stroke-width="3.4" stroke-linejoin="round">${body}</text>`;
    return `${halo}<text x="${num(x)}" y="${num(y)}" ${font} fill="${o.fill || C.ink}">${body}</text>`;
  };
  const dot = (x, y, r, fill, stroke) =>
    `<circle cx="${num(x)}" cy="${num(y)}" r="${r || 3.4}" fill="${fill || C.sky}" stroke="${stroke || C.white}" stroke-width="1.6"/>`;

  /* ---------- coordinate plane ---------- */
  function plane(cfg) {
    const W = cfg.w || 560, H = cfg.h || 320, pad = cfg.pad || 34;
    const { xmin, xmax, ymin, ymax } = cfg;
    const iw = W - pad * 2, ih = H - pad * 2;
    const sx = (x) => pad + ((x - xmin) / (xmax - xmin)) * iw;
    const sy = (y) => H - pad - ((y - ymin) / (ymax - ymin)) * ih;
    const stepX = cfg.stepX || niceStep(xmax - xmin), stepY = cfg.stepY || niceStep(ymax - ymin);
    let g = '';
    for (let x = Math.ceil(xmin / stepX) * stepX; x <= xmax + 1e-9; x += stepX) {
      g += `<line x1="${num(sx(x))}" y1="${num(sy(ymin))}" x2="${num(sx(x))}" y2="${num(sy(ymax))}" stroke="${C.line}" stroke-width="0.8" opacity="0.75"/>`;
    }
    for (let y = Math.ceil(ymin / stepY) * stepY; y <= ymax + 1e-9; y += stepY) {
      g += `<line x1="${num(sx(xmin))}" y1="${num(sy(y))}" x2="${num(sx(xmax))}" y2="${num(sy(y))}" stroke="${C.line}" stroke-width="0.8" opacity="0.75"/>`;
    }
    const ax = [];
    if (ymin <= 0 && ymax >= 0) {
      ax.push(`<line x1="${num(sx(xmin))}" y1="${num(sy(0))}" x2="${num(sx(xmax))}" y2="${num(sy(0))}" stroke="${C.inkSoft}" stroke-width="1.4"/>`);
      ax.push(label(sx(xmax) - 8, sy(0) - 7, 'x', { fill: C.inkSoft, size: 12 }));
      for (let x = Math.ceil(xmin / stepX) * stepX; x <= xmax + 1e-9; x += stepX) {
        if (Math.abs(x) < 1e-9) continue;
        ax.push(label(sx(x), sy(0) + 15, trim(x), { fill: C.inkSoft, size: 10 }));
      }
    }
    if (xmin <= 0 && xmax >= 0) {
      ax.push(`<line x1="${num(sx(0))}" y1="${num(sy(ymin))}" x2="${num(sx(0))}" y2="${num(sy(ymax))}" stroke="${C.inkSoft}" stroke-width="1.4"/>`);
      ax.push(label(sx(0) - 13, sy(ymax) - 4, 'y', { fill: C.inkSoft, size: 12, halo: false }));
      for (let y = Math.ceil(ymin / stepY) * stepY; y <= ymax + 1e-9; y += stepY) {
        if (Math.abs(y) < 1e-9) continue;
        ax.push(label(sx(0) - 10, sy(y) + 4, trim(y), { fill: C.inkSoft, size: 10, anchor: 'end' }));
      }
    }
    return { W, H, pad, sx, sy, grid: g, axes: ax.join('') };
  }

  function niceStep(span) {
    const raw = span / 8;
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / p;
    return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * p;
  }
  const trim = (v) => {
    const r = Math.round(v * 100) / 100;
    return String(r);
  };

  /* ---------- 1. quadratic parabola ---------- */
  function parabola(p) {
    const { a, b, c } = p;
    const D = b * b - 4 * a * c;
    const roots = D >= 0 ? [(-b + Math.sqrt(D)) / (2 * a), (-b - Math.sqrt(D)) / (2 * a)] : [];
    const xv = -b / (2 * a), yv = c - (b * b) / (4 * a);
    const spread = roots.length ? Math.max(2, Math.abs(roots[0] - roots[1]) * 1.1) : Math.max(4, Math.sqrt(Math.abs(D)) / Math.abs(a));
    const xmin = Math.min(xv, ...(roots.length ? roots : [0])) - spread * 0.55;
    const xmax = Math.max(xv, ...(roots.length ? roots : [0])) + spread * 0.55;
    let ymin = 0, ymax = 0;
    for (let i = 0; i <= 40; i++) {
      const x = xmin + (i / 40) * (xmax - xmin);
      const y = a * x * x + b * x + c;
      ymin = Math.min(ymin, y); ymax = Math.max(ymax, y);
    }
    const padY = Math.max(1, (ymax - ymin) * 0.12);
    ymin -= padY; ymax += padY;
    const P = plane({ xmin, xmax, ymin, ymax, w: 600, h: 330 });
    const pts = [];
    for (let i = 0; i <= 160; i++) {
      const x = xmin + (i / 160) * (xmax - xmin);
      pts.push(`${num(P.sx(x))},${num(P.sy(a * x * x + b * x + c))}`);
    }
    const clipId = 'clip' + Math.random().toString(36).slice(2, 8);
    let marks = '';
    roots.forEach((r, i) => {
      const below = yv > 0;                       /* curve opens upward → label under the axis */
      marks += dot(P.sx(r), P.sy(0), 4.2, C.red) +
        label(P.sx(r), P.sy(0) + (below ? 30 : -14), `x${i === 0 ? '₁' : '₂'} = ${trim(r).replace('-', '−')}`,
          { fill: C.red, size: 11, weight: 700, anchor: 'middle' });
    });
    marks += dot(P.sx(xv), P.sy(yv), 3.6, C.creamDeep, C.white) +
      label(P.sx(xv) + 6, P.sy(yv) + (a > 0 ? 20 : -12), 'vertex', { fill: C.creamDeep, size: 10.5, weight: 600, anchor: 'start' }) +
      `<line x1="${num(P.sx(xv))}" y1="${num(P.sy(ymin))}" x2="${num(P.sx(xv))}" y2="${num(P.sy(ymax))}"
        stroke="${C.skyMid}" stroke-width="1.2" stroke-dasharray="4 4" opacity="0.9"/>`;
    return wrap(P.W, P.H, `
      <defs><clipPath id="${clipId}"><rect x="${P.pad}" y="${P.pad}" width="${P.W - P.pad * 2}" height="${P.H - P.pad * 2}"/></clipPath></defs>
      ${P.grid}${P.axes}
      <polyline points="${pts.join(' ')}" fill="none" stroke="${C.sky}" stroke-width="2.6" clip-path="url(#${clipId})"/>
      ${marks}
      <text x="14" y="20" font-size="11" fill="${C.inkSoft}">y = ${esc(signPoly(a, b, c))}</text>`);
  }

  function signPoly(a, b, c) {
    const t = (v, first) => {
      if (Math.abs(v) < 1e-9) return '';
      const s = v < 0 ? '−' : (first ? '' : '+');
      const m = Math.abs(v);
      return `${s}${m === 1 ? '' : trim(m)}`;
    };
    return `${t(a, true)}x² ${t(b, false)}x ${t(c, false)}`.replace(/\s+/g, ' ').trim();
  }

  /* ---------- 2. two straight lines ---------- */
  function twoLines(p) {
    const { a1, b1, c1, a2, b2, c2, x, y } = p;
    const xmin = Math.min(x - 4, -2), xmax = Math.max(x + 4, 2);
    const ys = [];
    [xmin, xmax].forEach((xx) => {
      if (Math.abs(b1) > 1e-9) ys.push((c1 - a1 * xx) / b1);
      if (Math.abs(b2) > 1e-9) ys.push((c2 - a2 * xx) / b2);
    });
    ys.push(y);
    let ymin = Math.min(...ys), ymax = Math.max(...ys);
    if (!isFinite(ymin) || !isFinite(ymax) || ymax - ymin < 1) { ymin -= 3; ymax += 3; }
    const padY = Math.max(1, (ymax - ymin) * 0.25); ymin -= padY; ymax += padY;
    const P = plane({ xmin, xmax, ymin, ymax, w: 600, h: 330 });
    const line = (a, b, c, colour) => {
      if (Math.abs(b) < 1e-9) {
        const xx = c / a;
        return `<line x1="${num(P.sx(xx))}" y1="${num(P.sy(ymin))}" x2="${num(P.sx(xx))}" y2="${num(P.sy(ymax))}" stroke="${colour}" stroke-width="2.4"/>`;
      }
      const yAt = (xx) => (c - a * xx) / b;
      return `<line x1="${num(P.sx(xmin))}" y1="${num(P.sy(yAt(xmin)))}" x2="${num(P.sx(xmax))}" y2="${num(P.sy(yAt(xmax)))}" stroke="${colour}" stroke-width="2.4"/>`;
    };
    return wrap(P.W, P.H, `
      ${P.grid}${P.axes}
      ${line(a1, b1, c1, C.sky)}
      ${line(a2, b2, c2, C.creamDeep)}
      <line x1="${num(P.sx(x))}" y1="${num(P.sy(y))}" x2="${num(P.sx(x))}" y2="${num(P.sy(0))}" stroke="${C.inkSoft}" stroke-width="1" stroke-dasharray="3 3"/>
      <line x1="${num(P.sx(x))}" y1="${num(P.sy(y))}" x2="${num(P.sx(0))}" y2="${num(P.sy(y))}" stroke="${C.inkSoft}" stroke-width="1" stroke-dasharray="3 3"/>
      ${dot(P.sx(x), P.sy(y), 4.6, C.red)}
      ${label(P.sx(x) + 8, P.sy(y) - 10, `(${trim(x)}, ${trim(y)})`, { fill: C.red, size: 11.5, weight: 700, anchor: 'start' })}
      <g transform="translate(${P.W - 116},20)">
        <line x1="0" y1="0" x2="18" y2="0" stroke="${C.sky}" stroke-width="2.6"/>${label(22, 4, 'L₁', { anchor: 'start', size: 11 })}
        <line x1="0" y1="16" x2="18" y2="16" stroke="${C.creamDeep}" stroke-width="2.6"/>${label(22, 20, 'L₂', { anchor: 'start', size: 11 })}
      </g>`);
  }

  /* ---------- 3. distance on a grid ---------- */
  function distance(p) {
    const x1 = +p.x1, y1 = +p.y1, x2 = +p.x2, y2 = +p.y2;
    if (![x1, y1, x2, y2].every(isFinite)) return wrap(600, 330, '');
    const spanX = Math.max(2, Math.abs(x2 - x1) + 2), spanY = Math.max(2, Math.abs(y2 - y1) + 2);
    const xmin = Math.min(x1, x2) - spanX * 0.28, xmax = Math.max(x1, x2) + spanX * 0.28;
    const ymin = Math.min(y1, y2) - spanY * 0.28, ymax = Math.max(y1, y2) + spanY * 0.28;
    const P = plane({ xmin, xmax, ymin, ymax, w: 600, h: 330, stepX: 1, stepY: 1 });
    const px1 = P.sx(x1), py1 = P.sy(y1), px2 = P.sx(x2), py2 = P.sy(y2);
    const d = Math.hypot(x2 - x1, y2 - y1);
    const neg = (v) => String(v).replace('-', '−');
    return wrap(P.W, P.H, `
      ${P.grid}${P.axes}
      <line x1="${num(px1)}" y1="${num(py1)}" x2="${num(px2)}" y2="${num(py1)}" stroke="${C.creamDeep}" stroke-width="2" stroke-dasharray="5 4"/>
      <line x1="${num(px2)}" y1="${num(py1)}" x2="${num(px2)}" y2="${num(py2)}" stroke="${C.creamDeep}" stroke-width="2" stroke-dasharray="5 4"/>
      <line x1="${num(px1)}" y1="${num(py1)}" x2="${num(px2)}" y2="${num(py2)}" stroke="${C.sky}" stroke-width="3"/>
      ${dot(px1, py1, 5, C.sky)}${dot(px2, py2, 5, C.sky)}
      ${label(px1, py1 + 20, `P(${neg(x1)}, ${neg(y1)})`, { size: 11.5, weight: 700 })}
      ${label(px2, py2 - 12, `Q(${neg(x2)}, ${neg(y2)})`, { size: 11.5, weight: 700 })}
      ${label((px1 + px2) / 2, py1 + 18, `Δx = ${neg(Math.abs(x2 - x1))}`, { fill: C.creamDeep, size: 11, weight: 600 })}
      ${label(px2 + 10, (py1 + py2) / 2, `Δy = ${neg(Math.abs(y2 - y1))}`, { fill: C.creamDeep, size: 11, weight: 600, anchor: 'start' })}
      ${label((px1 + px2) / 2 - 6, (py1 + py2) / 2 - 10, `PQ = ${UP.num.fmt(d)}`, { fill: C.skyDeep, size: 12, weight: 700 })}
      ${label(300, 318, 'the two dashed gaps are the legs of a right triangle; PQ is the hypotenuse', { size: 10.5, fill: C.inkSoft })}`);
  }

  /* ---------- 4. right triangle (trig) ---------- */
  function rightTriangle(p) {
    const W = 600, H = 330;
    const bx = 120, by = 260, w = 340, h = Math.min(200, Math.max(90, w * (p.tan || 0.75)));
    const A = { x: bx, y: by }, B = { x: bx, y: by - h }, Cc = { x: bx + w, y: by };
    const ang = Math.atan2(h, w) * 180 / Math.PI;
    return wrap(W, H, `
      <path d="M${A.x} ${A.y} L${B.x} ${B.y} L${Cc.x} ${Cc.y} Z" fill="${C.skySoft}" stroke="${C.sky}" stroke-width="2.6"/>
      <path d="M${A.x} ${A.y - 22} L${A.x + 22} ${A.y - 22} L${A.x + 22} ${A.y}" fill="none" stroke="${C.inkSoft}" stroke-width="1.6"/>
      <path d="M ${A.x + 60} ${A.y} A 60 60 0 0 0 ${num(A.x + 60 * Math.cos(ang * Math.PI / 180))} ${num(A.y - 60 * Math.sin(ang * Math.PI / 180))}"
        fill="none" stroke="${C.red}" stroke-width="2"/>
      ${label(A.x + 76, A.y - 16, `${esc(p.angle || 'θ')}`, { fill: C.red, size: 12, weight: 700 })}
      ${label(A.x - 14, A.y - h / 2, p.opp || 'opposite', { size: 11, anchor: 'end' })}
      ${label(A.x + w / 2, A.y + 22, p.adj || 'adjacent', { size: 11 })}
      ${label(A.x + w / 2 + 16, A.y - h / 2 - 8, p.hyp || 'hypotenuse', { size: 11, fill: C.skyDeep })}
      ${p.chip ? `<g><rect x="${W - 168}" y="16" rx="9" width="152" height="54" fill="${C.cream}" stroke="${C.creamMid}"/>
        ${label(W - 152, 36, p.chipTitle || 'given', { anchor: 'start', size: 10.5, fill: C.inkSoft })}
        ${label(W - 152, 56, p.chip, { anchor: 'start', size: 14, weight: 700, fill: C.creamDeep })}</g>` : ''}
      ${label(A.x + 6, A.y + 20, 'A', { size: 11, fill: C.inkSoft })}
      ${label(B.x - 12, B.y + 4, 'B', { size: 11, fill: C.inkSoft })}
      ${label(Cc.x + 10, Cc.y + 14, 'C', { size: 11, fill: C.inkSoft })}`);
  }

  /* ---------- 5. angle of elevation ---------- */
  function elevation(p) {
    const W = 600, H = 330;
    const groundY = 268, footX = 120, tw = 40;
    const angle = Math.max(15, Math.min(80, +(p.angle || 60)));
    const dist = Math.max(30, +(p.dist || 40));
    const towerH = Math.tan(angle * Math.PI / 180) * 200;         /* always fits the frame */
    const twTop = groundY - Math.min(196, Math.max(70, towerH));
    const obsX = footX + 250;
    const apex = { x: footX + tw / 2, y: twTop };
    const rad = angle * Math.PI / 180;
    const arcR = 74;
    return wrap(W, H, `
      <line x1="${footX - 40}" y1="${groundY}" x2="${W - 34}" y2="${groundY}" stroke="${C.inkSoft}" stroke-width="1.6"/>
      <rect x="${footX}" y="${twTop}" width="${tw}" height="${groundY - twTop}" fill="${C.cream}" stroke="${C.creamDeep}" stroke-width="2"/>
      <line x1="${apex.x}" y1="${twTop}" x2="${obsX}" y2="${groundY}" stroke="${C.sky}" stroke-width="2.6"/>
      <line x1="${apex.x}" y1="${twTop}" x2="${obsX}" y2="${twTop}" stroke="${C.line}" stroke-width="1" stroke-dasharray="4 4"/>
      <line x1="${apex.x}" y1="${groundY}" x2="${obsX}" y2="${groundY}" stroke="${C.inkSoft}" stroke-width="1.4" stroke-dasharray="6 4"/>
      <path d="M ${num(obsX - arcR)} ${groundY} A ${arcR} ${arcR} 0 0 0 ${num(obsX - arcR * Math.cos(rad))} ${num(groundY - arcR * Math.sin(rad))}"
        fill="none" stroke="${C.red}" stroke-width="2.2"/>
      ${label(obsX - arcR * 0.72, groundY - arcR * 0.34, `${angle}°`, { fill: C.red, size: 12.5, weight: 700 })}
      ${label(footX + tw / 2, (twTop + groundY) / 2, `h`, { size: 13, weight: 700, fill: C.creamDeep })}
      ${label((apex.x + obsX) / 2, groundY + 20, `d = ${p.dist || '?'} m`, { size: 11.5, weight: 600 })}
      ${label(obsX + 6, groundY - 7, 'observer', { size: 9.5, anchor: 'start', fill: C.inkSoft })}
      ${label(apex.x, twTop - 10, 'top', { size: 10, fill: C.creamDeep })}
      <g transform="translate(24, 30)">
        <rect x="0" y="0" width="196" height="46" rx="10" fill="${C.cream}" stroke="${C.creamMid}"/>
        ${label(12, 20, 'tan(angle) = height / distance', { anchor: 'start', size: 10.5, fill: C.inkSoft })}
        ${label(12, 38, `tan ${angle}° = h / ${p.dist || 'd'}`, { anchor: 'start', size: 12, weight: 700, mono: true })}
      </g>`);
  }

  /* ---------- 6. sector ---------- */
  function sector(p) {
    const W = 600, H = 330, cx = 230, cy = 190, r = 118;
    const th = (p.theta || 90) * Math.PI / 180;
    const a0 = -Math.PI / 2;
    const p0 = { x: cx + r * Math.cos(a0), y: cy + r * Math.sin(a0) };
    const p1 = { x: cx + r * Math.cos(a0 + th), y: cy + r * Math.sin(a0 + th) };
    const large = th > Math.PI ? 1 : 0;
    const mid = a0 + th / 2;
    return wrap(W, H, `
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${C.line}" stroke-width="1.6" stroke-dasharray="4 4"/>
      <path d="M${cx} ${cy} L${num(p0.x)} ${num(p0.y)} A ${r} ${r} 0 ${large} 1 ${num(p1.x)} ${num(p1.y)} Z"
        fill="${C.skyMid}" fill-opacity="0.55" stroke="${C.sky}" stroke-width="2.4"/>
      <path d="M ${cx + 34 * Math.cos(a0)} ${cy + 34 * Math.sin(a0)} A 34 34 0 ${large} 1 ${num(cx + 34 * Math.cos(a0 + th))} ${num(cy + 34 * Math.sin(a0 + th))}"
        fill="none" stroke="${C.red}" stroke-width="1.8"/>
      ${dot(cx, cy, 3.4, C.inkSoft)}
      ${label(cx + 56 * Math.cos(mid), cy + 56 * Math.sin(mid), `${esc(p.theta || 90)}°`, { fill: C.red, size: 11.5, weight: 700 })}
      ${label((cx + p0.x) / 2 - 26, (cy + p0.y) / 2, `r = ${esc(p.r || '?')}`, { size: 11.5, weight: 600 })}
      ${label(cx - 12, cy + 18, 'O', { size: 11, fill: C.inkSoft, anchor: 'end' })}
      <g transform="translate(${W - 210}, 40)">
        <rect x="0" y="0" width="196" height="76" rx="10" fill="${C.cream}" stroke="${C.creamMid}"/>
        ${label(12, 22, 'shaded part = sector', { anchor: 'start', size: 10.5, fill: C.inkSoft })}
        ${label(12, 46, `area = ${esc(p.area || 'θ/360 × πr²')}`, { anchor: 'start', size: 12, weight: 700, fill: C.creamDeep })}
        ${label(12, 66, `arc = ${esc(p.arc || 'θ/360 × 2πr')}`, { anchor: 'start', size: 11, fill: C.ink })}
      </g>`);
  }

  /* ---------- 7. solids ---------- */
  function solid(p) {
    const W = 600, H = 330, cx = 210, cy = 175;
    const kind = p.solid || 'cylinder';
    let body = '', notes = '';
    if (kind === 'sphere' || kind === 'hemisphere') {
      const r = 96;
      body = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.skySoft}" stroke="${C.sky}" stroke-width="2.4"/>` +
        (kind === 'hemisphere'
          ? `<path d="M${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy} Z" fill="${C.skyMid}" fill-opacity="0.45"/>
             <ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * 0.26}" fill="none" stroke="${C.sky}" stroke-width="2"/>`
          : `<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * 0.3}" fill="none" stroke="${C.skyMid}" stroke-width="1.4" stroke-dasharray="4 4"/>`);
      body += `<line x1="${cx}" y1="${cy}" x2="${cx + r}" y2="${cy}" stroke="${C.creamDeep}" stroke-width="1.8"/>` +
        label(cx + r / 2, cy - 8, `r = ${esc(p.r || '?')}`, { fill: C.creamDeep, size: 11.5, weight: 600 });
    } else if (kind === 'cone') {
      /* h was a fixed 190 with cy = 175, which put the apex at y = -15 -- off
         the top of the canvas, so the whole cone rendered blank.  Fit the
         height to the space above the base instead. */
      const r = 96, h = Math.min(190, cy - 30);
      body = `<path d="M${cx} ${cy - h} L${cx + r} ${cy} A ${r} ${r * 0.28} 0 0 1 ${cx - r} ${cy} Z" fill="${C.skySoft}" stroke="${C.sky}" stroke-width="2.4"/>
        <ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * 0.28}" fill="none" stroke="${C.skyMid}" stroke-width="1.2" stroke-dasharray="4 4"/>`;
      body += `<line x1="${cx}" y1="${cy - h}" x2="${cx}" y2="${cy}" stroke="${C.creamDeep}" stroke-width="1.6" stroke-dasharray="4 3"/>` +
        label(cx + 6, cy - h / 2, `h = ${esc(p.h || '?')}`, { anchor: 'start', fill: C.creamDeep, size: 11.5 }) +
        `<line x1="${cx}" y1="${cy}" x2="${cx + r}" y2="${cy}" stroke="${C.creamDeep}" stroke-width="1.6"/>` +
        label(cx + r / 2, cy + 16, `r = ${esc(p.r || '?')}`, { fill: C.creamDeep, size: 11.5 });
    } else {
      const r = 88, h = 176;
      body = `<path d="M${cx - r} ${cy - h / 2} L${cx - r} ${cy + h / 2} A ${r} ${r * 0.28} 0 0 0 ${cx + r} ${cy + h / 2} L${cx + r} ${cy - h / 2}"
          fill="${C.skySoft}" stroke="${C.sky}" stroke-width="2.4"/>
        <ellipse cx="${cx}" cy="${cy - h / 2}" rx="${r}" ry="${r * 0.28}" fill="${C.skyMid}" fill-opacity="0.5" stroke="${C.sky}" stroke-width="2.2"/>
        <ellipse cx="${cx}" cy="${cy + h / 2}" rx="${r}" ry="${r * 0.28}" fill="none" stroke="${C.sky}" stroke-width="2"/>`;
      body += `<line x1="${cx}" y1="${cy - h / 2}" x2="${cx + r}" y2="${cy - h / 2}" stroke="${C.creamDeep}" stroke-width="1.6"/>` +
        label(cx + r / 2, cy - h / 2 - 12, `r = ${esc(p.r || '?')}`, { fill: C.creamDeep, size: 11.5, weight: 600, halo: false }) +
        `<line x1="${cx + r + 22}" y1="${cy - h / 2}" x2="${cx + r + 22}" y2="${cy + h / 2}" stroke="${C.creamDeep}" stroke-width="1.6"/>` +
        label(cx + r + 30, cy + 4, `h = ${esc(p.h || '?')}`, { anchor: 'start', fill: C.creamDeep, size: 11.5, weight: 600 });
    }
    return wrap(W, H, `
      ${body}
      <g transform="translate(${W - 232}, 46)">
        <rect x="0" y="0" width="216" height="94" rx="10" fill="${C.cream}" stroke="${C.creamMid}"/>
        ${label(12, 22, esc(kind === 'hemisphere' ? 'hemisphere' : kind), { anchor: 'start', size: 10.5, fill: C.inkSoft })}
        ${(p.formulas || []).slice(0, 3).map((f, i) => label(12, 44 + i * 18, f, { anchor: 'start', size: 11.5, mono: true })).join('')}
      </g>`);
  }


  /* =========================================================
     Composite solids — a cone on a cylinder, a hemisphere scooped out
     of a cylinder, and so on. Drawn as a stack so the whole object the
     question describes is visible, not just one of its parts.
     parts: [{shape:'cylinder'|'cone'|'hemisphere'|'sphere'|'frustum', r, h, role}]
     stacked bottom-to-top, sharing one centre line.
     ========================================================= */
  function compositeSolid(p) {
    const parts = (p.parts || []).filter(x => x && x.shape && (x.r || x.h));
    if (!parts.length) return solid(p);

    const W = 620, H = 420;
    const cx = 214;                       /* centre line */
    const baseY = 372;                    /* the ground the object stands on */

    /* work in "shape units" first, then pick one scale for the whole stack
       so a 7 cm cylinder and a 21 cm cone are drawn in true proportion */
    const unitH = (x) => (x.shape === 'sphere' ? 2 * (x.r || 1)
      : x.shape === 'hemisphere' ? (x.r || 1)
      : (x.h || x.r || 1));
    const totalU = parts.reduce((t, x) => t + unitH(x), 0);
    const maxR = Math.max.apply(null, parts.map(x => x.r || 1));

    const availH = baseY - 46;
    const availW = 300;                    /* leave room for the label panel */
    const scale = Math.min(availH / totalU, availW / (2 * maxR));

    const px = (v) => v * scale;
    let y = baseY;
    let body = '';

    parts.forEach((pt, i) => {
      const r = px(pt.r || 1);
      const ry = Math.max(3, r * 0.26);
      const tint = i % 2 ? C.cream : C.skySoft;
      const edge = i % 2 ? C.creamDeep : C.sky;

      if (pt.shape === 'cylinder') {
        const h = px(unitH(pt));
        body += `<path d="M${num(cx - r)} ${num(y - h)} L${num(cx - r)} ${num(y)}
          A ${num(r)} ${num(ry)} 0 0 0 ${num(cx + r)} ${num(y)} L${num(cx + r)} ${num(y - h)}"
          fill="${tint}" stroke="${edge}" stroke-width="2.2"/>`
          + `<ellipse cx="${num(cx)}" cy="${num(y - h)}" rx="${num(r)}" ry="${num(ry)}"
             fill="${tint}" stroke="${edge}" stroke-width="2"/>`
          + `<line x1="${num(cx)}" y1="${num(y - h)}" x2="${num(cx + r)}" y2="${num(y - h)}"
             stroke="${C.creamDeep}" stroke-width="1.2" stroke-dasharray="3 3"/>`
          + label(cx + r / 2, y - h - 8, 'r = ' + (pt.r != null ? pt.r : '?'),
                  { fill: C.creamDeep, size: 11, weight: 600 })
          + (pt.h != null ? `<line x1="${num(cx + r + 15)}" y1="${num(y - h)}" x2="${num(cx + r + 15)}" y2="${num(y)}"
             stroke="${C.creamDeep}" stroke-width="1.4"/>`
             + label(cx + r + 21, y - h / 2 + 4, 'h = ' + pt.h,
                     { anchor: 'start', fill: C.creamDeep, size: 11, weight: 600 }) : '');
        y -= h;

      } else if (pt.shape === 'cone') {
        const h = px(unitH(pt));
        body += `<path d="M${num(cx)} ${num(y - h)} L${num(cx + r)} ${num(y)}
          A ${num(r)} ${num(ry)} 0 0 1 ${num(cx - r)} ${num(y)} Z"
          fill="${tint}" stroke="${edge}" stroke-width="2.2"/>`
          + `<line x1="${num(cx)}" y1="${num(y - h)}" x2="${num(cx)}" y2="${num(y)}"
             stroke="${C.creamDeep}" stroke-width="1.3" stroke-dasharray="4 3"/>`
          + (pt.h != null ? label(cx + 8, y - h / 2, 'h = ' + pt.h,
                  { anchor: 'start', fill: C.creamDeep, size: 11, weight: 600 }) : '')
          + (pt.slant ? label(cx + r * 0.55, y - h * 0.52, 'l = ' + pt.slant,
                  { anchor: 'start', fill: C.creamDeep, size: 10.5 }) : '');
        y -= h;

      } else if (pt.shape === 'hemisphere') {
        body += `<path d="M${num(cx - r)} ${num(y)} A ${num(r)} ${num(r)} 0 0 1 ${num(cx + r)} ${num(y)} Z"
          fill="${tint}" stroke="${edge}" stroke-width="2.2"/>`
          + `<ellipse cx="${num(cx)}" cy="${num(y)}" rx="${num(r)}" ry="${num(ry)}"
             fill="none" stroke="${edge}" stroke-width="1.6"/>`
          + label(cx + r * 0.5, y - r * 0.5, 'r = ' + (pt.r != null ? pt.r : '?'),
                  { fill: C.creamDeep, size: 11, weight: 600 });
        y -= r;

      } else if (pt.shape === 'sphere') {
        const rr = px(pt.r || 1);
        body += `<circle cx="${num(cx)}" cy="${num(y - rr)}" r="${num(rr)}"
          fill="${tint}" stroke="${edge}" stroke-width="2.2"/>`
          + label(cx + rr * 0.55, y - rr, 'r = ' + (pt.r != null ? pt.r : '?'),
                  { fill: C.creamDeep, size: 11, weight: 600 });
        y -= 2 * rr;
      }
    });

    /* the panel: what this object is made of, and the formulas to use */
    const lines = parts.map(function (pt) {
      const bits = [];
      if (pt.r != null) bits.push('r = ' + pt.r);
      if (pt.h != null) bits.push('h = ' + pt.h);
      return (pt.role || pt.shape) + (bits.length ? ' · ' + bits.join(', ') : '');
    });
    const fms = (p.formulas || []).slice(0, 4);

    return wrap(W, H, `
      <line x1="34" y1="${baseY + 8}" x2="${W - 214}" y2="${baseY + 8}" stroke="${C.line}" stroke-width="2"/>
      ${body}
      <g transform="translate(${W - 196}, 44)">
        <rect x="0" y="0" width="182" height="${30 + lines.length * 17 + fms.length * 17}" rx="10"
          fill="${C.cream}" stroke="${C.creamMid}"/>
        ${lines.map((t, i) => label(11, 21 + i * 17, t, { anchor: 'start', size: 10.5, fill: C.inkSoft })).join('')}
        ${fms.map((f, i) => label(11, 27 + lines.length * 17 + i * 17, f, { anchor: 'start', size: 11, mono: true })).join('')}
      </g>`);
  }

  /* ---------- 8. dice grid ---------- */
  function diceGrid(p) {
    const W = 600, H = 330, cell = 34, ox = 150, oy = 62;
    const target = p.target || 7;
    let g = '';
    for (let i = 1; i <= 6; i++) {
      for (let j = 1; j <= 6; j++) {
        const hit = i + j === target;
        g += `<rect x="${ox + (i - 1) * cell}" y="${oy + (j - 1) * cell}" width="${cell - 3}" height="${cell - 3}" rx="4"
          fill="${hit ? C.skyMid : C.white}" stroke="${hit ? C.sky : C.line}" stroke-width="1.2"/>`;
        g += label(ox + (i - 1) * cell + (cell - 3) / 2, oy + (j - 1) * cell + (cell - 3) / 2 + 3.6, `${i + j}`,
          { size: 9.5, fill: hit ? C.skyDeep : C.inkSoft, weight: hit ? 700 : 400 });
      }
    }
    for (let i = 1; i <= 6; i++) {
      g += label(ox + (i - 1) * cell + (cell - 3) / 2, oy - 8, `${i}`, { size: 10, fill: C.inkSoft });
      g += label(ox - 14, oy + (i - 1) * cell + (cell - 3) / 2 + 3.6, `${i}`, { size: 10, fill: C.inkSoft });
    }
    const ways = 6 - Math.abs(target - 7);
    return wrap(W, H, `${g}
      ${label(ox + 3 * cell, oy + 6 * cell + 22, 'first die →', { size: 10, fill: C.inkSoft })}
      <g transform="translate(${W - 196}, 74)">
        <rect x="0" y="0" width="182" height="92" rx="10" fill="${C.cream}" stroke="${C.creamMid}"/>
        ${label(12, 22, 'sum = ' + target, { anchor: 'start', size: 11, fill: C.inkSoft })}
        ${label(12, 48, `${ways} cells`, { anchor: 'start', size: 15, weight: 700, fill: C.creamDeep })}
        ${label(12, 70, `P = ${ways}/36`, { anchor: 'start', size: 12, mono: true })}
        ${label(12, 86, 'of 36 equally likely', { anchor: 'start', size: 9.5, fill: C.inkSoft })}
      </g>`);
  }

  /* ---------- 9. similar triangles ---------- */
  function similarTriangles(p) {
    const W = 600, H = 330;
    const s1 = 1, s2 = Math.max(0.45, Math.min(1, Math.sqrt((p.r2 || 49) / (p.r1 || 81))));
    const base1 = 210, base2 = 210 * s2;
    const h1 = 150, h2 = 150 * s2;
    const x1 = 90, x2 = 380;
    const tri = (x, base, h, col, fill) =>
      `<path d="M${x} ${250} L${x + base} ${250} L${x + base * 0.42} ${250 - h} Z" fill="${fill}" fill-opacity="0.45" stroke="${col}" stroke-width="2.4"/>`;
    return wrap(W, H, `
      ${tri(x1, base1, h1, C.sky, C.skySoft)}
      ${tri(x2, base2, h2, C.creamDeep, C.cream)}
      ${label(x1 + base1 / 2, 274, `ar = ${esc(p.r1 || 'A₁')}`, { size: 11.5, weight: 700, fill: C.skyDeep })}
      ${label(x2 + base2 / 2, 274, `ar = ${esc(p.r2 || 'A₂')}`, { size: 11.5, weight: 700, fill: C.creamDeep })}
      ${label(x1 + base1 * 0.42, 250 - h1 - 10, '△ABC', { size: 11 })}
      ${label(x2 + base2 * 0.42, 250 - h2 - 10, '△DEF', { size: 11 })}
      <line x1="${x1 + base1 / 2}" y1="292" x2="${x2 + base2 / 2}" y2="292" stroke="${C.inkSoft}" stroke-width="1.2" stroke-dasharray="4 4"/>
      ${label((x1 + x2) / 2 + 20, 306, `sides in ratio ${esc(p.sideRatio || '√A₁ : √A₂')}`, { size: 11, fill: C.ink })}
      ${label(W / 2, 40, `ar(△ABC) / ar(△DEF) = (AB / DE)²`, { size: 12, weight: 600, mono: true })}`);
  }

  /* ---------- 10. BPT triangle ---------- */
  function bpt(p) {
    const W = 600, H = 330;
    const A = { x: 250, y: 46 }, B = { x: 90, y: 276 }, Cc = { x: 460, y: 276 };
    const t = (p.t || 0.4);
    const D = { x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t };
    const E = { x: A.x + (Cc.x - A.x) * t, y: A.y + (Cc.y - A.y) * t };
    return wrap(W, H, `
      <path d="M${A.x} ${A.y} L${B.x} ${B.y} L${Cc.x} ${Cc.y} Z" fill="${C.skySoft}" fill-opacity="0.5" stroke="${C.sky}" stroke-width="2.4"/>
      <line x1="${num(D.x)}" y1="${num(D.y)}" x2="${num(E.x)}" y2="${num(E.y)}" stroke="${C.red}" stroke-width="2.6"/>
      ${dot(D.x, D.y, 4, C.red)}${dot(E.x, E.y, 4, C.red)}
      ${label(A.x, A.y - 12, 'A', { size: 11.5, weight: 700 })}
      ${label(B.x - 14, B.y + 16, 'B', { size: 11.5, weight: 700 })}
      ${label(Cc.x + 12, Cc.y + 16, 'C', { size: 11.5, weight: 700 })}
      ${label(D.x - 16, D.y, 'D', { size: 11.5, weight: 700, fill: C.red })}
      ${label(E.x + 16, E.y, 'E', { size: 11.5, weight: 700, fill: C.red })}
      ${label((A.x + B.x) / 2 - 30, (A.y + B.y) / 2, 'AD', { size: 10.5, fill: C.inkSoft, anchor: 'end' })}
      ${label((B.x + D.x) / 2 - 30, (B.y + D.y) / 2 + 6, 'DB', { size: 10.5, fill: C.inkSoft, anchor: 'end' })}
      ${label((A.x + Cc.x) / 2 + 30, (A.y + Cc.y) / 2, 'AE', { size: 10.5, fill: C.inkSoft, anchor: 'start' })}
      ${label((Cc.x + E.x) / 2 + 30, (Cc.y + E.y) / 2 + 6, 'EC', { size: 10.5, fill: C.inkSoft, anchor: 'start' })}
      ${label(W / 2, 306, 'DE ∥ BC  ⟹  AD/DB = AE/EC', { size: 12.5, weight: 700, mono: true })}`);
  }

  /* ---------- 11. tangent ---------- */
  function tangent(p) {
    const W = 600, H = 330, O = { x: 250, y: 186 }, r = 96;
    const d = Math.min(258, r * (p.ratio || 2.4));
    const Q = { x: O.x + d, y: O.y };
    const tLen = Math.sqrt(Math.max(1, d * d - r * r));
    const ang = Math.acos(r / d);
    const T = { x: O.x + r * Math.cos(ang), y: O.y - r * Math.sin(ang) };
    return wrap(W, H, `
      <circle cx="${O.x}" cy="${O.y}" r="${r}" fill="${C.skySoft}" stroke="${C.sky}" stroke-width="2.4"/>
      <line x1="${num(T.x)}" y1="${num(T.y)}" x2="${Q.x}" y2="${Q.y}" stroke="${C.red}" stroke-width="2.6"/>
      <line x1="${O.x}" y1="${O.y}" x2="${Q.x}" y2="${Q.y}" stroke="${C.inkSoft}" stroke-width="1.5"/>
      <line x1="${O.x}" y1="${O.y}" x2="${num(T.x)}" y2="${num(T.y)}" stroke="${C.skyDeep}" stroke-width="1.8"/>
      <path d="M${num(T.x + 14 * Math.cos(ang + Math.PI / 2))} ${num(T.y - 14 * Math.sin(ang + Math.PI / 2))} l${num(14 * Math.cos(ang))} ${num(-14 * Math.sin(ang))} l${num(-14 * Math.cos(ang + Math.PI / 2))} ${num(14 * Math.sin(ang + Math.PI / 2))}"
        fill="none" stroke="${C.inkSoft}" stroke-width="1.4"/>
      ${dot(O.x, O.y, 3.4, C.inkSoft)}${dot(Q.x, Q.y, 5, C.red)}${dot(T.x, T.y, 4, C.sky)}
      ${label(O.x - 12, O.y + 18, 'O', { size: 11.5, weight: 700 })}
      ${label(Q.x + 12, Q.y + 18, 'Q', { size: 11.5, weight: 700, fill: C.red })}
      ${label(T.x - 6, T.y - 12, 'T', { size: 11.5, weight: 700, fill: C.skyDeep })}
      ${label((O.x + T.x) / 2 - 8, (O.y + T.y) / 2 - 8, `r = ${esc(p.r || '?')}`, { size: 10.5, fill: C.skyDeep })}
      ${label(O.x + d / 2, O.y + 22, `d = ${esc(p.d || '?')}`, { size: 10.5, fill: C.inkSoft })}
      ${label((T.x + Q.x) / 2 + 8, (T.y + Q.y) / 2 - 12, `t = ${esc(p.t || '?')}`, { size: 11, fill: C.red, weight: 600 })}
      ${label(W / 2, 310, 'OT ⊥ TQ   ⟹   t² = d² − r²', { size: 12.5, weight: 700, mono: true })}`);
  }

  /* ---------- 11b. tangents at ends of diameter are parallel ---------- */
  function diamTangents() {
    const W = 600, H = 330, O = { x: 300, y: 170 }, r = 100;
    const A = { x: O.x - r, y: O.y }, B = { x: O.x + r, y: O.y };
    const tY1 = O.y - 120, tY2 = O.y + 120;   /* tangent lines pass through A and B, horizontal */
    return wrap(W, H, `
      <circle cx="${O.x}" cy="${O.y}" r="${r}" fill="${C.skySoft}" stroke="${C.sky}" stroke-width="2.4"/>
      <line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}" stroke="${C.skyDeep}" stroke-width="2.2"/>
      <line x1="${A.x - 130}" y1="${tY1}" x2="${A.x + 130}" y2="${tY1}" stroke="${C.red}" stroke-width="2.6"/>
      <line x1="${B.x - 130}" y1="${tY2}" x2="${B.x + 130}" y2="${tY2}" stroke="${C.red}" stroke-width="2.6"/>
      <path d="M${A.x - 14} ${tY1 + 14} l14 -14 l14 14" fill="none" stroke="${C.inkSoft}" stroke-width="1.4"/>
      <path d="M${B.x - 14} ${tY2 + 14} l14 -14 l14 14" fill="none" stroke="${C.inkSoft}" stroke-width="1.4"/>
      ${dot(O.x, O.y, 3.4, C.inkSoft)}${dot(A.x, A.y, 4, C.sky)}${dot(B.x, B.y, 4, C.sky)}
      ${label(O.x, O.y + 20, 'O', { size: 11.5, weight: 700 })}
      ${label(A.x - 12, A.y + 20, 'A', { size: 11.5, weight: 700, fill: C.skyDeep })}
      ${label(B.x + 8, B.y + 20, 'B', { size: 11.5, weight: 700, fill: C.skyDeep })}
      ${label((O.x + A.x)/2 - 6, O.y - 10, 'r', { size: 11, fill: C.skyDeep })}
      ${label((O.x + B.x)/2 + 6, O.y - 10, 'r', { size: 11, fill: C.skyDeep })}
      ${label(A.x - 145, tY1 - 10, 'l₁ (tangent at A)', { size: 11, fill: C.red, weight: 600, anchor: 'start' })}
      ${label(B.x - 145, tY2 + 22, 'l₂ (tangent at B)', { size: 11, fill: C.red, weight: 600, anchor: 'start' })}
      ${label(W / 2, 300, 'OA ⊥ l₁,  OB ⊥ l₂,  A-O-B collinear  ⟹  l₁ ∥ l₂', { size: 12, weight: 700, mono: true })}`);
  }

  /* ---------- 12. AP ladder ---------- */
  function apLadder(p) {
    const W = 600, H = 330;
    const terms = p.terms || [];
    const n = Math.min(6, terms.length || 5);
    const stepX = 82, ox = 96, y = 210;
    let g = '';
    for (let i = 0; i < n; i++) {
      const x = ox + i * stepX;
      g += `<rect x="${x - 22}" y="${y - 20}" width="46" height="40" rx="9" fill="${i === 0 ? C.skyMid : C.white}" stroke="${C.sky}" stroke-width="1.8"/>`;
      g += label(x + 1, y + 5, trim(terms[i]), { size: 12, weight: 700, fill: i === 0 ? C.skyDeep : C.ink });
      if (i < n - 1) {
        g += `<path d="M${x + 26} ${y} h${stepX - 54}" stroke="${C.creamDeep}" stroke-width="1.8" marker-end="url(#arrowhead)"/>`;
        g += label(x + stepX / 2 + 1, y - 8, `+${trim(p.d)}`, { size: 10, fill: C.creamDeep, weight: 600 });
      }
    }
    return wrap(W, H, `
      <defs><marker id="arrowhead" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
        <path d="M0 0 L7 3.5 L0 7 Z" fill="${C.creamDeep}"/></marker></defs>
      ${g}
      ${label(ox - 22, y + 44, 'a = first term', { size: 10.5, fill: C.inkSoft, anchor: 'start' })}
      ${label(ox + 2 * stepX, y - 46, 'common difference d', { size: 11, fill: C.creamDeep, weight: 600 })}
      <g transform="translate(96, 264)">
        <rect x="0" y="0" width="408" height="46" rx="10" fill="${C.cream}" stroke="${C.creamMid}"/>
        ${label(14, 20, `aₙ = a + (n − 1)d`, { anchor: 'start', size: 12, mono: true })}
        ${label(14, 38, `Sₙ = n/2 [2a + (n − 1)d]`, { anchor: 'start', size: 12, mono: true, fill: C.creamDeep })}
      </g>`);
  }

  /* ---------- 13. mean number line ---------- */
  function meanLine(p) {
    const W = 600, H = 330;
    const data = p.data || [];
    const min = Math.min(...data), max = Math.max(...data);
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const ox = 70, span = W - 150;
    const sx = (v) => ox + ((v - min) / Math.max(1, max - min)) * span;
    let g = `<line x1="${ox}" y1="230" x2="${W - 60}" y2="230" stroke="${C.inkSoft}" stroke-width="1.6"/>`;
    const count = {};
    data.forEach((v) => { count[v] = (count[v] || 0) + 1; });
    Object.keys(count).map(Number).sort((a, b) => a - b).forEach((v) => {
      for (let k = 0; k < count[v]; k++) {
        g += dot(sx(v), 230 - 26 * (k + 1), 6, C.sky);
      }
      g += label(sx(v), 250, trim(v), { size: 10.5, fill: C.inkSoft });
    });
    g += `<line x1="${num(sx(mean))}" y1="40" x2="${num(sx(mean))}" y2="238" stroke="${C.red}" stroke-width="2" stroke-dasharray="6 4"/>`;
    g += label(sx(mean), 30, `mean = ${trim(mean)}`, { fill: C.red, size: 12, weight: 700 });
    return wrap(W, H, g +
      label(W / 2, 292, `Σx = ${trim(data.reduce((a, b) => a + b, 0))}   ·   n = ${data.length}`, { size: 12, mono: true }));
  }

  /* ---------- 14. prime factor Venn (HCF / LCM) ---------- */
  function factorVenn(p) {
    const W = 600, H = 330;
    const fac = (n) => { const m = {}; let x = n; for (let i = 2; i * i <= x; i++) { while (x % i === 0) { m[i] = (m[i] || 0) + 1; x /= i; } } if (x > 1) m[x] = (m[x] || 0) + 1; return m; };
    const f1 = fac(p.a || 12), f2 = fac(p.b || 18);
    const common = Object.keys(f1).filter((k) => f2[k]);
    const only1 = Object.keys(f1).filter((k) => !f2[k]);
    const only2 = Object.keys(f2).filter((k) => !f1[k]);
    const chip = (x, y, t) => `<g><rect x="${x - 26}" y="${y - 15}" width="52" height="30" rx="8" fill="${C.white}" stroke="${C.sky}" stroke-width="1.4"/>${label(x, y + 4, t, { size: 12, weight: 700, mono: true })}</g>`;
    return wrap(W, H, `
      <circle cx="228" cy="160" r="104" fill="${C.skySoft}" stroke="${C.sky}" stroke-width="2"/>
      <circle cx="372" cy="160" r="104" fill="${C.cream}" fill-opacity="0.85" stroke="${C.creamDeep}" stroke-width="2"/>
      ${label(150, 60, `a = ${esc(p.a || '12')}`, { size: 12, weight: 700, fill: C.skyDeep })}
      ${label(450, 60, `b = ${esc(p.b || '18')}`, { size: 12, weight: 700, fill: C.creamDeep })}
      ${only1.map((k, i) => chip(168, 130 + i * 40, `${k}${f1[k] > 1 ? '²' : ''}`)).join('')}
      ${only2.map((k, i) => chip(432, 130 + i * 40, `${k}${f2[k] > 1 ? '²' : ''}`)).join('')}
      ${common.map((k, i) => chip(300, 130 + i * 40, `${k}${Math.min(f1[k], f2[k]) > 1 ? '²' : ''}`)).join('')}
      ${label(300, 300, 'HCF = product of the overlap  ·  LCM = product of everything', { size: 11.5, fill: C.ink })}
      ${label(300, 28, 'prime factors', { size: 10.5, fill: C.inkSoft })}`);
  }

  /* ---------- 15. division ladder ---------- */
  function factorTree(p) {
    const W = 600, H = 330;
    const n = Math.max(4, Math.round(p.n || 24));
    const primes = [];
    let rest = n;
    for (let i = 2; i <= rest; i++) {
      while (rest % i === 0) { primes.push(String(i)); rest /= i; }
    }
    const rows = [];
    let cur = n;
    primes.forEach((pr) => { rows.push({ d: pr, v: cur }); cur = cur / Number(pr); });
    rows.push({ d: '', v: 1 });

    const rowH = Math.min(40, 250 / (rows.length + 1));
    const top = 54, left = 120, colW = 118;
    let g = '';
    g += `<line x1="${left + colW + 18}" y1="${top - 16}" x2="${left + colW + 18}" y2="${top + rowH * rows.length}" stroke="${C.line}" stroke-width="1.4"/>`;
    rows.forEach((r, i) => {
      const y = top + i * rowH;
      if (i < rows.length - 1) {
        g += `<rect x="${left - 6}" y="${y - 15}" width="${54}" height="${rowH - 6}" rx="7" fill="${C.skyMid}" stroke="${C.sky}" stroke-width="1.3"/>`;
        g += label(left + 21, y + 4, `${r.d}`, { size: 12, weight: 700, fill: C.skyDeep });
        g += `<path d="M${left + 30} ${y - 12} q 0 14 10 14" fill="none" stroke="${C.sky}" stroke-width="1.6"/>`;
      }
      g += `<rect x="${left + colW - 26}" y="${y - 15}" width="${92}" height="${rowH - 6}" rx="7"
        fill="${i === rows.length - 1 ? C.cream : C.white}" stroke="${i === rows.length - 1 ? C.creamDeep : C.line}" stroke-width="1.3"/>`;
      g += label(left + colW + 20, y + 4, `${r.v}`, { size: 12, weight: 600, mono: true });
    });
    return wrap(W, H, `${g}
      ${label(left + 21, top - 26, 'divide by', { size: 10, fill: C.inkSoft })}
      ${label(left + colW + 20, top - 26, 'quotient', { size: 10, fill: C.inkSoft })}
      <g transform="translate(${W - 214}, 60)">
        <rect x="0" y="0" width="196" height="70" rx="10" fill="${C.cream}" stroke="${C.creamMid}"/>
        ${label(12, 22, 'every divisor is prime', { anchor: 'start', size: 10, fill: C.inkSoft })}
        ${label(12, 46, `${n} = ${primes.join(' × ')}`, { anchor: 'start', size: 11.5, weight: 700, mono: true })}
        ${label(12, 62, 'stop when the quotient is 1', { anchor: 'start', size: 9.5, fill: C.inkSoft })}
      </g>`);
  }

  /* ---------- 16. √n on the number line ---------- */
  function sqrtLine(p) {
    const W = 600, H = 330;
    const n = Math.max(2, Math.round(p.n || 5));
    const root = Math.sqrt(n);
    const legBase = Math.sqrt(n - 1);                 /* legs √(n−1) and 1 → hypotenuse √n */
    const axisY = 250, ox = 105;
    const unit = Math.min(110, Math.min(430 / Math.max(2.2, root + 0.6), 190 / 1.2));
    const bx = ox, by = axisY;
    const tx = ox + legBase * unit, ty = axisY - unit;  /* apex of the right triangle */
    const px = ox + root * unit;                       /* where the arc lands */
    return wrap(W, H, `
      <line x1="${ox - 46}" y1="${axisY}" x2="${W - 40}" y2="${axisY}" stroke="${C.inkSoft}" stroke-width="1.6"/>
      ${[0, 1, 2, 3].map((k) => `<line x1="${num(ox + k * unit)}" y1="${axisY - 6}" x2="${num(ox + k * unit)}" y2="${axisY + 6}" stroke="${C.inkSoft}" stroke-width="1.4"/>` +
        label(ox + k * unit, axisY + 20, `${k}`, { size: 10.5, fill: C.inkSoft })).join('')}
      <path d="M${num(bx)} ${num(by)} L${num(tx)} ${num(ty)} L${num(tx)} ${num(by)} Z"
        fill="${C.skySoft}" fill-opacity="0.75" stroke="${C.sky}" stroke-width="2.2"/>
      <path d="M${num(tx - 14)} ${num(ty)} L${num(tx - 14)} ${num(ty + 14)} L${num(tx)} ${num(ty + 14)}" fill="none" stroke="${C.inkSoft}" stroke-width="1.3"/>
      ${label((bx + tx) / 2, by - 10, `${legBase === 1 ? '1' : `√${n - 1}`} = ${trim(legBase)}`, { size: 11, fill: C.ink })}
      ${label(tx + 12, (ty + by) / 2, '1', { size: 11, fill: C.ink, anchor: 'start' })}
      ${label((bx + tx) / 2 - 12, (by + ty) / 2 - 10, `√${n}`, { size: 12.5, weight: 700, fill: C.skyDeep })}
      <path d="M${num(tx)} ${num(ty)} A ${num(root * unit)} ${num(root * unit)} 0 0 1 ${num(px)} ${num(axisY)}"
        fill="none" stroke="${C.red}" stroke-width="2" stroke-dasharray="6 4"/>
      ${dot(px, axisY, 5, C.red)}
      ${label(px, axisY + 40, `√${n} ≈ ${trim(root)}`, { size: 12, weight: 700, fill: C.red })}
      ${label(px, axisY + 57, 'falls between 2 and 3 — never exactly p/q', { size: 10, fill: C.inkSoft })}
      <g transform="translate(24, 28)">
        <rect x="0" y="0" width="200" height="58" rx="10" fill="${C.cream}" stroke="${C.creamMid}"/>
        ${label(12, 20, 'right triangle: legs √(n−1) and 1', { anchor: 'start', size: 10, fill: C.inkSoft })}
        ${label(12, 40, `hypotenuse² = (${n - 1}) + 1 = ${n}`, { anchor: 'start', size: 11.5, weight: 600, mono: true })}
        ${label(12, 53, 'so the arc marks exactly √' + n, { anchor: 'start', size: 9.5, fill: C.inkSoft })}
      </g>`);
  }

  /* ---------- 17. concept map for topic sheets ---------- */
  function conceptMap(p) {
    const W = 600, H = 330;
    const items = (p.items || []).map((t) => String(t).replace(/\s+—.*$/, '')).slice(0, 6);
    const shorten = (t, n) => (t.length > n ? t.slice(0, n - 1).trim() + '…' : t);
    const centre = shorten(String(p.center || 'topic').replace(/\s+—.*$/, ''), 24);
    let g = '';

    if (items.length <= 4) {
      /* few branches: centre on the left, branches stacked on the right — reads like a list */
      const cx = 138, cy = H / 2;
      const cw = Math.min(240, 26 + centre.length * 7.2);
      const rowH = Math.min(62, 200 / Math.max(1, items.length)) + (items.length <= 3 ? 10 : 0);
      const top = cy - (rowH * (items.length - 1)) / 2;
      items.forEach((it, i) => {
        const y = top + i * rowH;
        /* branch labels are the *short* concept names, not full sentences */
        const text = shorten(String(it).split(/[—:(]/)[0].trim(), 26);
        const w = Math.min(230, 26 + text.length * 6.2);
        const x = 396;
        g += `<path d="M${num(cx + cw / 2)} ${cy} C ${num(cx + cw / 2 + 60)} ${cy}, ${num(x - w / 2 - 40)} ${num(y)}, ${num(x - w / 2)} ${num(y)}"
          fill="none" stroke="${C.line}" stroke-width="1.6"/>`;
        g += `<rect x="${num(x - w / 2)}" y="${num(y - 16)}" width="${num(w)}" height="32" rx="9"
          fill="${C.white}" stroke="${i % 2 ? C.creamDeep : C.sky}" stroke-width="1.5"/>`;
        g += label(x, y + 4.5, text, { size: 10.8, weight: 500 });
      });
      return wrap(W, H, `${g}
        <rect x="${num(cx - cw / 2)}" y="${num(cy - 24)}" width="${num(cw)}" height="48" rx="12" fill="${C.skyMid}" stroke="${C.sky}" stroke-width="2"/>
        ${label(cx, cy + 5, centre, { size: 12, weight: 700, fill: C.skyDeep })}
        ${label(cx, 42, 'this topic', { size: 10, fill: C.inkSoft })}`);
    }

    /* six branches: radial */
    const cx = W / 2, cy = H / 2;
    items.forEach((it, i) => {
      const a = (i / items.length) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(a) * 196, y = cy + Math.sin(a) * 104;
      const text = shorten(it, 26);
      const w = Math.min(210, 26 + text.length * 6.1);
      g += `<line x1="${cx}" y1="${cy}" x2="${num(x)}" y2="${num(y)}" stroke="${C.line}" stroke-width="1.6"/>`;
      g += `<rect x="${num(x - w / 2)}" y="${num(y - 15)}" width="${num(w)}" height="30" rx="8"
        fill="${C.white}" stroke="${i % 2 ? C.creamDeep : C.sky}" stroke-width="1.5"/>`;
      g += label(x, y + 4, text, { size: 10.2, weight: 500 });
    });
    return wrap(W, H, `
      ${g}
      <rect x="${cx - 104}" y="${cy - 22}" width="208" height="44" rx="11" fill="${C.skyMid}" stroke="${C.sky}" stroke-width="2"/>
      ${label(cx, cy + 4.5, centre, { size: 11.5, weight: 700, fill: C.skyDeep })}`);
  }

  /* ---------- scatter: statistics mean-of-grouped ---------- */
  function bars(p) {
    const W = 600, H = 330;
    const data = p.data || [];
    const max = Math.max(...data.map((d) => d.v)) || 1;
    const bw = (W - 160) / data.length;
    let g = `<line x1="70" y1="270" x2="${W - 50}" y2="270" stroke="${C.inkSoft}" stroke-width="1.5"/>`;
    data.forEach((d, i) => {
      const h = (d.v / max) * 180;
      g += `<rect x="${num(70 + i * bw + 8)}" y="${num(270 - h)}" width="${num(bw - 16)}" height="${num(h)}" rx="5" fill="${C.skyMid}" stroke="${C.sky}" stroke-width="1.2"/>`;
      g += label(70 + i * bw + bw / 2, 270 - h - 8, `${d.v}`, { size: 10.5, weight: 600, fill: C.skyDeep });
      g += label(70 + i * bw + bw / 2, 288, d.k, { size: 10, fill: C.inkSoft });
    });
    return wrap(W, H, g + label(W / 2, 312, p.caption || 'frequency', { size: 11, fill: C.ink }));
  }

  function wrap(W, H, inner) {
    return `<svg viewBox="0 0 ${W} ${H}" role="img" xmlns="http://www.w3.org/2000/svg"
      style="width:100%;height:auto;display:block">${inner}</svg>`;
  }


  /* =========================================================
     Generic diagram — draws any shape the AI describes.
     spec = {
       type: 'plane' | 'triangle' | 'circle' | 'bars',
       points: [{x,y,label}],            // for 'plane' and 'triangle'
       circles: [{cx,cy,r,label,fill}],  // for 'circle' and 'plane'
       segments: [[x1,y1,x2,y2,'#hex']], // extra lines
       bars: [{label,value}],
       caption: '...'
     }
     Everything is optional; the renderer picks sensible ranges.
     ========================================================= */
  function generic(spec) {
    spec = spec || {};

    /* A solid described as a STACK of parts goes straight to compositeSolid.
       Before this channel existed the model had no way to say "cylinder with a
       cone on top", so it did the only thing it could -- flattened the object
       into straight segments -- and produced a diagram that was not the solid
       in the question. */
    if ((spec.type === 'solid' || spec.type === 'composite') && (spec.parts || []).length) {
      const stack = spec.parts
        .filter(function (x) { return x && (x.shape === 'cylinder' || x.shape === 'cone' || x.shape === 'hemisphere' || x.shape === 'sphere'); })
        .map(function (x) { return { shape: x.shape, r: Number(x.r) || undefined, h: x.h == null ? undefined : Number(x.h), role: x.role || x.shape }; });
      /* every part needs a real measurement, or the picture would be labelled
         with numbers the question never gave */
      if (stack.length && stack.every(function (x) { return x.r > 0 && (x.shape === 'sphere' || x.shape === 'hemisphere' || x.h > 0); })) {
        return compositeSolid({ parts: stack });
      }
    }

    // Provider JSON can use object segments or numeric strings. Never let a
    // missing coordinate poison the bounds (NaN collapsed every SVG point to 0).
    // Keep supplied geometry or refuse it; do not fabricate replacement values.
    if (['plane', 'triangle', 'circle', 'bars'].includes(spec.type)) {
      const coordinate = v => (typeof v === 'number' || (typeof v === 'string' && v.trim())) && Number.isFinite(Number(v)) ? Number(v) : NaN;
      let invalid = false;
      const rows = key => {
        if (spec[key] == null) return [];
        if (!Array.isArray(spec[key])) { invalid = true; return []; }
        return spec[key];
      };
      const objects = (key, fields) => rows(key).map(row => {
        if (!row || typeof row !== 'object' || Array.isArray(row)) { invalid = true; return {}; }
        const out = Object.assign({}, row);
        fields.forEach(k => { out[k] = coordinate(row[k]); if (!Number.isFinite(out[k])) invalid = true; });
        return out;
      });
      const normalized = Object.assign({}, spec, {
        points: objects('points', ['x', 'y']),
        circles: objects('circles', ['cx', 'cy', 'r']),
        ellipses: objects('ellipses', ['cx', 'cy', 'rx', 'ry']),
        labels: objects('labels', ['x', 'y']),
        bars: objects('bars', ['value']),
        segments: rows('segments').map(row => {
          const values = Array.isArray(row) ? row.slice() : row && typeof row === 'object'
            ? [row.x1, row.y1, row.x2, row.y2, row.color || row.stroke, row.dash] : [];
          for (let i = 0; i < 4; i++) {
            values[i] = coordinate(values[i]);
            if (!Number.isFinite(values[i])) invalid = true;
          }
          return values;
        })
      });
      if (normalized.circles.some(c => c.r <= 0) || normalized.ellipses.some(e => e.rx <= 0 || e.ry <= 0)) invalid = true;
      const geometry = normalized.points.length + normalized.circles.length + normalized.segments.length + normalized.ellipses.length;
      if (invalid || (spec.type === 'bars' ? !normalized.bars.length : !geometry) || (spec.type === 'triangle' && normalized.points.length < 3)) return '';
      spec = normalized;
    }

    const pts = (spec.points || []).filter(p => typeof p.x === 'number' && typeof p.y === 'number');
    const circles = spec.circles || [];
    const segs = spec.segments || [];
    const ells = spec.ellipses || [];        /* {cx, cy, rx, ry} — solid bases   */
    const texts = spec.labels || [];         /* {x, y, text} — dimension labels  */

    /* ============ CHEMISTRY / PHYSICS / BIOLOGY SCHEMATICS ============
       The shapes are deliberately simple, labelled line drawings — they read
       like textbook blackboards and never pretend to be photography. */
    const app = (spec.apparatus || (spec.type === 'apparatus' ? spec.parts : null)) || null;
    if (app || spec.type === 'reaction' || spec.type === 'beaker' || spec.type === 'test-tube' || spec.type === 'flask' || spec.type === 'burner') {
      return apparatusFig(spec);
    }
    if (spec.type === 'lens' || spec.type === 'mirror' || spec.type === 'ray') {
      return opticsFig(spec);
    }
    if (spec.type === 'circuit') {
      return circuitFig(spec);
    }
    if (spec.type === 'pulley' || spec.type === 'pendulum') {
      return mechanicsFig(spec);
    }
    if (spec.type === 'leaf' || spec.type === 'cell' || spec.type === 'flower' || spec.type === 'organ' || spec.type === 'bio') {
      return biologyFig(spec);
    }

    /* ---- bar chart ---- */
    if (spec.type === 'bars' && (spec.bars || []).length) {
      const bars = spec.bars.filter(b => typeof b.value === 'number');
      const W = 560, H = 300, pad = 44;
      const maxV = Math.max(1, ...bars.map(b => b.value));
      const bw = Math.min(64, (W - pad * 2) / Math.max(1, bars.length) * 0.62);
      const gap = (W - pad * 2) / Math.max(1, bars.length);
      let inner = `<line x1="${pad}" y1="${H - pad}" x2="${W - pad}" y2="${H - pad}" stroke="${C.line}" stroke-width="1.4"/>`;
      bars.forEach((b, i) => {
        const h = (b.value / maxV) * (H - pad * 2);
        const x = pad + gap * i + (gap - bw) / 2;
        inner += `<rect x="${num(x)}" y="${num(H - pad - h)}" width="${num(bw)}" height="${num(h)}" rx="5"
            fill="${C.skySoft}" stroke="${C.sky}" stroke-width="1.6"/>` +
          label(x + bw / 2, H - pad - h - 7, String(b.value), { size: 11, fill: C.skyDeep }) +
          label(x + bw / 2, H - pad + 16, String(b.label), { size: 11, fill: C.inkSoft });
      });
      return wrap(W, H, inner);
    }

    /* ---- everything else lives on a plane ---- */
    let xs = pts.map(p => p.x).concat(circles.map(c => c.cx - c.r), circles.map(c => c.cx + c.r));
    let ys = pts.map(p => p.y).concat(circles.map(c => c.cy - c.r), circles.map(c => c.cy + c.r));
    segs.forEach(sg => { xs.push(sg[0], sg[2]); ys.push(sg[1], sg[3]); });
    ells.forEach(e => { xs.push(e.cx - e.rx, e.cx + e.rx); ys.push(e.cy - e.ry, e.cy + e.ry); });
    texts.forEach(l => { xs.push(l.x); ys.push(l.y); });

    /* circle-only specs: derive from the radius alone */
    if (!xs.length && circles.length) {
      const c = circles[0];
      xs = [c.cx - c.r, c.cx + c.r]; ys = [c.cy - c.r, c.cy + c.r];
    }
    if (!xs.length) { xs = [-5, 5]; ys = [-5, 5]; }

    let xmin = Math.min(...xs), xmax = Math.max(...xs);
    let ymin = Math.min(...ys), ymax = Math.max(...ys);
    if (xmax - xmin < 1e-9) { xmin -= 1; xmax += 1; }
    if (ymax - ymin < 1e-9) { ymin -= 1; ymax += 1; }
    const mx = (xmax - xmin) * 0.16 || 1, my = (ymax - ymin) * 0.16 || 1;
    xmin -= mx; xmax += mx; ymin -= my; ymax += my;
    if (![xmin, xmax, ymin, ymax, xmax - xmin, ymax - ymin].every(Number.isFinite)) return '';
    if (xmax <= xmin || ymax <= ymin) return '';

    const PL = plane({ xmin, xmax, ymin, ymax, w: 580, h: 360 });
    const X = PL.sx, Y = PL.sy;
    /* one unit in screen pixels, taken from whichever axis is tighter */
    const S = Math.min(1 / ((xmax - xmin) / (580 - 68)), 1 / ((ymax - ymin) / (360 - 68)));
    let inner = PL.grid + PL.axes;

    /* filled triangle from the three named points */
    if (spec.type === 'triangle' && pts.length >= 3) {
      const poly = pts.slice(0, 3).map(q => `${num(X(q.x))},${num(Y(q.y))}`).join(' ');
      inner += `<polygon points="${poly}" fill="${C.skySoft}" stroke="${C.sky}" stroke-width="2" stroke-linejoin="round"/>`;
    }

    /* circles */
    circles.forEach(c => {
      inner += `<circle cx="${num(X(c.cx))}" cy="${num(Y(c.cy))}" r="${num(c.r * S)}"
        fill="${c.fill || 'none'}" stroke="${c.stroke || C.creamDeep}" stroke-width="1.8" opacity="0.95"/>`;
      if (c.label) inner += label(X(c.cx), Y(c.cy) - c.r * S - 6, c.label, { size: 11, fill: C.creamDeep });
    });

    /* extra segments */
    segs.forEach(sg => {
      inner += `<line x1="${num(X(sg[0]))}" y1="${num(Y(sg[1]))}" x2="${num(X(sg[2]))}" y2="${num(Y(sg[3]))}"
        stroke="${sg[4] || C.violet}" stroke-width="1.8" stroke-dasharray="${sg[5] || ''}"/>`;
    });

    /* ellipses: the elliptical base of a cylinder/cone, or the equator of a sphere */
    ells.forEach(e => {
      inner += `<ellipse cx="${num(X(e.cx))}" cy="${num(Y(e.cy))}" rx="${num(e.rx * S)}" ry="${num(e.ry * S)}"
        fill="${e.fill || 'none'}" stroke="${e.stroke || C.skyMid}" stroke-width="1.5"
        stroke-dasharray="${e.dashed ? '4 4' : ''}"/>`;
    });

    /* free-standing dimension labels, e.g. "h = 12 cm" beside a height */
    texts.forEach(l => {
      inner += label(X(l.x), Y(l.y), String(l.text), { size: 12, weight: 600, fill: C.creamDeep });
    });

    /* the points last, so they sit on top */
    pts.forEach(q => {
      inner += dot(X(q.x), Y(q.y), 4.2, q.color || C.sky, C.white);
      if (q.label) inner += label(X(q.x) + 9, Y(q.y) - 9, q.label, { size: 12, weight: 700, fill: C.ink });
      if (q.show) inner += label(X(q.x) + 9, Y(q.y) + 16,
        `(${num(q.x).toString().replace(/\.0$/, '')}, ${num(q.y).toString().replace(/\.0$/, '')})`,
        { size: 10.5, fill: C.inkSoft });
    });

    return wrap(580, 360, inner);
  }


  /* =========================================================
     Circumcentre: the three vertices on a circle, the centre
     joined to each vertex, and the perpendicular bisectors.
     ========================================================= */
  function circumcentreFig(p) {
    const pts = (p.pts || []).slice(0, 3);
    const O = p.centre || [];
    if (pts.length < 3 || O.length < 2 || !isFinite(p.r)) return wrap(560, 420, '');
    const names = ['A', 'B', 'C'];
    const points = pts.map((q, i) => ({ x: q[0], y: q[1], label: names[i], show: true, color: C.sky }));
    points.push({ x: O[0], y: O[1], label: 'O', show: true, color: C.violet });
    const segments = [];
    /* radii from O to each vertex */
    pts.forEach(q => segments.push([O[0], O[1], q[0], q[1], C.violet, '']));
    /* the triangle itself */
    for (let i = 0; i < 3; i++) {
      const a = pts[i], b = pts[(i + 1) % 3];
      segments.push([a[0], a[1], b[0], b[1], C.skyDeep, '']);
    }
    /* perpendicular bisectors through O — dashed, so the reason is visible */
    for (let i = 0; i < 3; i++) {
      const a = pts[i], b = pts[(i + 1) % 3];
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const len = Math.hypot(dx, dy) || 1;
      /* direction perpendicular to AB, scaled to reach well past O */
      const ux = -dy / len, uy = dx / len;
      const reach = Math.max(len, p.r) * 1.35;
      segments.push([mx - ux * reach, my - uy * reach, mx + ux * reach, my + uy * reach, C.creamDeep, '6 5']);
    }
    return generic({
      type: 'plane',
      points,
      circles: [{ cx: O[0], cy: O[1], r: p.r, stroke: C.sky, fill: 'none' }],
      segments
    });
  }

  /* =========================================================
     The dispatcher: one function the app calls for every answer
     ========================================================= */

  /* ============================================================
     AUTO FIGURE — a diagram for a bank question that was never
     drawn by hand.

     The rule that matters: a figure is only returned when the
     question's OWN numbers make the shape determinate. An
     unlabelled cylinder under "find the volume of a cylinder of
     radius 7 cm and height 10 cm" is worse than no picture,
     because it looks like it came from the paper. So every
     parser below must find real numbers or return null, and the
     caller draws nothing.

     Everything here is pure arithmetic on the question text —
     no model call, no network, nothing to hallucinate.
     ============================================================ */
  const N = '(' + '\\u2212' + '?-?\\s*)?(\\d+(?:\\.\\d+)?)';   /* sign + number */

  /* pull "r = 7", "radius 7 cm", "of radius 14" ... in one place */
  function grab(text, words) {
    for (let i = 0; i < words.length; i++) {
      const re = new RegExp('(?:' + words[i] + ')\\s*(?:is|=|:)?\\s*' + N, 'i');
      const m = text.match(re);
      if (m) { const v = parseFloat(m[2]); if (isFinite(v) && v > 0) return v; }
    }
    return null;
  }

  /* the first N "a, b, c" numbers in a sentence, for data lists */
  function numbersIn(text) {
    const out = [];
    const re = /(?<![\d.])(\d+(?:\.\d+)?)/g;
    let m;
    while ((m = re.exec(text)) && out.length < 60) out.push(parseFloat(m[1]));
    return out;
  }

  function autoSolid(text) {
    const t = String(text || '').toLowerCase();
    /* a cone sitting on a cylinder and the like need their own layout */
    if (/frustum/.test(t)) return null;                 /* no honest generic form */
    const cyl = /cylinder/.test(t), cone = /cone/.test(t),
          sph = /\bsphere\b/.test(t), hemi = /hemispher/.test(t);
    if (!cyl && !cone && !sph && !hemi) return null;
    /* A composite solid is NOT one of these shapes. A cylinder with a conical
       cavity is not a cylinder, and drawing a plain cylinder under it would be
       a picture of a different object -- which is exactly the failure this
       feature must avoid. No composite drawing: refuse. */
    if (/cavit|hollowed|melted|melt|recas|dropped|immersed|submerged|converted|recas|vessel/.test(t) || (cyl && cone) ||
        (hemi && (cyl || cone)) || (cyl && sph) || (sph && cone)) {
      return null;
    }
    /* Two separate objects of different shapes ("a hemispherical bowl and a
       cylindrical mallet", "two cups, one cylindrical, the other
       hemispherical") cannot be shown by one labelled shape: whichever we
       pick, the picture is of the other object. The text says two things, so
       count the shapes, not just their presence. */
    const shapeMentions = (t.match(/cylindric|cylinders?\b|conical|cones?\b|spheric|spheres?\b|hemispher/g) || []).length;
    if (shapeMentions > 2) return null;
    /* "two types of cups", "two vessels" -- more than one object */
    if (/\b(two|three|both)\b[^.]{0,60}(cup|vessel|bowl|cone|cylinder|sphere|solid|container|glass|tank)/.test(t)) return null;
    const kind = sph ? 'sphere' : hemi ? 'hemisphere' : cone ? 'cone' : 'cylinder';
    let r = grab(t, ['radius(?:\\s+of\\s+(?:the\\s+)?(?:base|cylinder|cone|sphere))?',
                     'base\\s+radius', 'radii']);
    let h = grab(t, ['height(?:\\s+of\\s+(?:the\\s+)?(?:cylinder|cone))?', 'tall', 'h']);
    /* "slant height 13 cm" -- a cone's slant is not its vertical height, and
       labelling it h would be wrong. It is also not what this renderer draws. */
    if (/slant\s*height|clay|remould|remold|reshap/.test(t)) return null;
    if (kind === 'sphere' || kind === 'hemisphere') h = null;
    if (r == null) {
      /* diameter is just as determinate as radius */
      const d = grab(t, ['diameter(?:\\s+of\\s+(?:the\\s+)?(?:base|cylinder|cone|sphere))?']);
      if (d == null || d <= 0) return null;
      r = d / 2;
    }
    if (kind !== 'sphere' && kind !== 'hemisphere' && h == null) return null;
    /* reject absurd ratios that mean we grabbed the wrong numbers */
    if (h != null && (h / r > 40 || h / r < 0.05)) return null;
    return { solid: kind, r: r, h: h == null ? undefined : h };
  }


  /* ---------- composite solids ----------
     A cone on a cylinder, a hemisphere on a cone, a cylinder with a conical
     cavity. Before this, every one of them was REFUSED -- correctly, because
     drawing a plain cylinder under "a cylinder with a conical cavity" is a
     picture of a different object.

     Refusing was safe but the student got no picture at all, and this is the
     single largest family in the mensuration questions. So the text is parsed
     into parts, each with its OWN numbers, and compositeSolid() draws them
     stacked in true proportion. If any part's numbers are missing or the
     arrangement is ambiguous, it is still refused: a half-labelled composite
     is the same lie as a wrong plain solid. */
  function autoComposite(text) {
    const t = String(text || '').toLowerCase();
    const shapes = [];
    /* the adjectival forms are how the papers actually write these:
       "cylindrical", "conical", "hemispherical". Matching only the nouns
       missed half the questions. */
    const re = /(solid\s+)?(cylindric\w*|cylinders?|conical|cones?|hemispher\w*|spherical|spheres?|frustum)/g;
    let m;
    while ((m = re.exec(t))) {
      let sh = m[2];
      if (/^cylind/.test(sh)) sh = 'cylinder';
      else if (/^con/.test(sh)) sh = 'cone';
      else if (/^hemispher/.test(sh)) sh = 'hemisphere';
      else if (/^spher/.test(sh)) sh = 'sphere';
      shapes.push({ shape: sh, at: m.index });
    }
    if (shapes.length < 2) return null;
    if (/frustum/.test(t)) return null;              /* not drawn by this renderer */
    /* A SPHERE is now allowed in the stack: compositeSolid already draws one,
       and the common shapes are a stadium (cylinder with a hemisphere at each
       end) and a ball resting on a cylinder. A sphere DROPPED INTO something or
       two objects side by side are excluded by the word checks above. */

    /* "a cone mounted on a hemisphere ... the height of the cone is 4" names
       thecone TWICE. Keeping both mentions leaves an empty clause in the middle
       and every part after it gets the wrong numbers. Keep the first mention of
       each shape only, in the order they appear. */
    const seenShape = {};
    const uniq = [];
    shapes.forEach(function (sh) {
      if (seenShape[sh.shape]) return;
      seenShape[sh.shape] = true;
      uniq.push(sh);
    });
    shapes.length = 0;
    uniq.forEach(function (sh) { shapes.push(sh); });
    if (shapes.length < 2) return null;

    /* A part's numbers are the ones in its own clause: split on the shape
       names so "cylinder of height 20 and diameter 12, a conical cavity of
       height 8 and radius 6" gives each part its own pair. */
    const parts = [];
    for (let i = 0; i < shapes.length; i++) {
      const shape = shapes[i].shape;
      /* A part's measurements are usually in its own clause -- but not always:
         "a cone mounted on a hemisphere of radius 3·5. The height of the cone
         is 4" gives the cone nothing locally. Read its own clause first; if a
         number is missing, read the whole sentence but ONLY from a phrase that
         names that same shape ("height of the cone"). Never take a neighbour's
         number: that is how a 3·5 cm hemisphere would become a 4 cm one. */
      const to = i + 1 < shapes.length ? shapes[i + 1].at : t.length;
      const local = t.slice(shapes[i].at, to);
      /* Split sentences on ". " (a full stop FOLLOWED BY SPACE), never on a
         bare dot: the decimal point in "3·5" is not a sentence end, and
         splitting there turned a radius of 3·5 into a radius of 3. */
      const named = new RegExp('([^.]*(?:\\.\\d+[^.]*)*\\b' + shape + '\\b[^.]*(?:\\.\\d+[^.]*)*)', 'gi');
      const elsewhere = (t.match(named) || []).join(' . ');
      const clause = local;
      const rd = ['radius(?:\\s+of\\s+(?:the\\s+)?(?:base|cylinder|cone|sphere))?', 'base\\s+radius'];
      const dd = ['diameter(?:\\s+of\\s+(?:the\\s+)?(?:base|cylinder|cone|sphere))?'];
      const hd = ['height(?:\\s+of\\s+(?:the\\s+)?(?:cylinder|cone|hemisphere|part|top))?', 'tall', 'high'];
      let r = grab(clause, rd);
      if (r == null) { const d = grab(clause, dd); if (d != null) r = d / 2; }
      let h = grab(clause, hd);
      /* second pass, restricted to phrases that name this shape */
      if (r == null) { const d2 = grab(elsewhere, rd); if (d2 != null) r = d2; }
      /* "of the same radius" -- shares the previous part's radius, and grab()
         will happily find the number that belongs to the OTHER solid. That is
         right when the text says so, and wrong otherwise; only accept it when
         the phrase is actually there. */
      if (r == null && /same\s+radius/.test(t) && parts.length) r = parts[parts.length - 1].r;
      if (r == null) { const dd2 = grab(elsewhere, dd); if (dd2 != null) r = dd2 / 2; }
      if (h == null) h = grab(elsewhere, hd);
      if (h == null) {
        const hm = clause.match(/(\d+(?:\.\d+)?)\s*(?:m|cm|metres?|meters?)\s+(?:high|tall)/);
        if (hm) h = parseFloat(hm[1]);
      }
      if (r == null) return null;                    /* a part without a size */
      if ((shape === 'cylinder' || shape === 'cone') && h == null) return null;
      /* a hemisphere and a sphere have no height of their own -- any number
         picked up here belongs to the part above, and labelling it h on a
         hemisphere would be a wrong measurement printed as fact */
      if (shape === 'hemisphere' || shape === 'sphere') h = undefined;
      parts.push({ shape: shape, r: r, h: h == null ? undefined : h });
    }

    /* The same radius written once for a shared base is common:
       "a cone of radius 7 is placed on a cylinder of the same radius" --
       grab() already picks it up for both because the clause runs to the next
       shape name. Anything else (two different radii for one shared face) is
       left alone: compositeSolid draws each part at its own r, which is honest. */

    /* Which way up? A cavity is cut INTO the part before it; a solid is stacked
       ON it. Turning a cavity into a stack would draw a bump where there is a
       hole, so that case is refused rather than approximated. */
    /* Words that mean material was REMOVED. A cavity, a scooped-out
       hemisphere, "a cone is removed from a cylinder" -- all of these would be
       drawn by the stacker as a bump on top, which is the opposite of what the
       student is looking at. Refuse the whole family rather than approximate. */
    if (/cavit|hollow|removed|remove|scoop|drilled|cut out|cut off|carved|bored/.test(t)) return null;

    /* Melting and recasting names two DIFFERENT objects at two different times
       -- the sphere that was, and the cones that now are. Drawn as a stack it
       would show a shape the question never claims exists. Same for wire,
       bullets, and anything "converted" or "moulded". */
    if (/melt|recast|re-cast|drawn into|converted|moulded|molded|hammered|forged|redrawn/.test(t)) return null;

    /* Side by side is not stacked: "two types of cups", "one cylindrical and
       one conical", "two solid cones" are separate objects. */
    if (/two (types|kinds|different)|one .* and one |\brespectively\b/.test(t)) return null;

    /* A stack has to be SAID to be joined. Without one of these words the two
       shapes are just two things mentioned in the same sentence, and stacking
       them would invent an arrangement. */
    if (!/\b(on|upon|mount|surmount|surmounted|placed|rests|resting|standing|stacked|attached|joined|fitted|topped|with\s+(?:two\s+)?(?:hemispherical|conical|cylindrical)?\s*(?:ends|top|base)|ends)/.test(t)) return null;

    /* ordering: "a cone on a cylinder" reads left to right, but the stack is
       drawn bottom-up. The LAST named solid is the base when the text says
       "on/upon/mounted on/standing on". */
    const baseLast = /\b(on|upon|mounted on|standing on|surmounting|top of)\b/.test(t);
    const stack = baseLast ? parts.slice().reverse() : parts.slice();
    return {
      parts: stack.map(function (p, i) {
        return { shape: p.shape, r: p.r, h: p.h, role: (i === 0 ? 'base: ' : '') + p.shape };
      })
    };
  }

  function autoRightTriangle(text) {
    const t = String(text || '').toLowerCase();
    if (!/(angle of elevation|angle of depression|tower|ladder|top of|foot of)/.test(t)) return null;
    /* two angles or two objects means two triangles, possibly on opposite
       sides -- one triangle would show half of the problem and mislead */
    if (/\b(two|both|either|ships?|boats?|cars?|aeroplanes?|planes)\b/.test(t)) return null;
    if ((t.match(/angle of (elevation|depression)/g) || []).length > 1) return null;
    /* "the angles of elevation of the bottom and top" is two right triangles
       stacked; one triangle would show only half the geometry */
    if (/\b(bottom|top)\b[^.]{0,40}\band\b[^.]{0,20}\b(bottom|top)\b/.test(t)) return null;
    let ang = null;
    const am = t.match(/(\d+(?:\.\d+)?)\s*(?:°|degrees?\b|deg\b)/);
    if (am) ang = parseFloat(am[1]);
    if (ang == null || ang <= 0 || ang >= 90) return null;
    let h = grab(t, ['height(?:\\s+of\\s+the\\s+(?:tower|building|pole))?', 'tall', 'high', 'long']);
    if (h == null) {
      /* "a tower 50 m high" -- the number precedes the word */
      const hm = t.match(/(\d+(?:\.\d+)?)\s*(?:m|cm|metres?|meters?)\s+(?:high|tall|long)/);
      if (hm) h = parseFloat(hm[1]);
    }
    if (h == null || h / 1 > 1e6) return null;
    return { angle: ang, height: h };
  }

  function autoCircle(text) {
    const t = String(text || '').toLowerCase();
    /* "a parallelogram circumscribing a circle is a rhombus" mentions a circle
       but the figure is a parallelogram. Only draw when the circle itself is
       the subject: its area, its circumference, or its radius. */
    if (/\barcs?\b/.test(t)) return null;
    if (!/(area|circumference|perimeter|radius)\s+(of\s+)?(the\s+)?circle/.test(t)) return null;
    if (/tangent|chord|secant|diameter|\barc\b|sector|segment|rhombus|parallelogram|triangle|square|rectangle|quadrilateral/.test(t)) return null;
    const r = grab(t, ['radius(?:\\s+of\\s+(?:the\\s+)?circle)?']);
    if (r == null) return null;
    return { circles: [{ cx: 0, cy: 0, r: r, label: 'r = ' + r }],
             labels: [{ x: r / 2, y: -0.35, text: 'r = ' + r }],
             caption: 'Circle of radius ' + r + ', drawn to the question\u2019s own measurement.' };
  }

  /* Decide, for one question, whether an honest figure exists. Returns a
     generic() spec, or null. */
  function autoFigureFor(q) {
    if (!q) return null;
    // Figures only make sense for Maths / Physics (mensuration, geometry,
    // ray optics, circuits). A passing mention of "sphere" in English or
    // Hindi prose would otherwise trigger a nonsense drawing.
    const subj = (q.subject || 'maths');
    if (subj !== 'maths' && subj !== 'science') return null;
    const text = String(q.en || q.hi || '');
    if (text.length < 20) return null;
    /* Imported rows carry OCR debris: page numbers, marks, stray symbols glued
       to the end ("... by the arc. 2 The area of the"). One such row parsed as
       a CYLINDER (r=21, h=15) because a stray "h 15" survived the OCR. A figure
       drawn from debris is a figure of a question nobody asked, so the first
       sentence is used, and anything that still contains junk is refused. */
    const firstSentence = text.split(/(?<=\.)\s+(?=[A-Z(])/)[0] || text;
    if (/[\u0000-\u001f]/.test(firstSentence)) return null;
    // Require either a unit (cm/m) or an actual shape keyword in a maths
    // mensuration context. A bare "radius" or "height" word in social/english
    // will no longer produce a random solid.
    const hasUnit = /\d+(?:\.\d+)?\s*(?:cm|m|mm|m\\.|\s?m\b|°|degree)/i.test(firstSentence);
    const hasShapeWord = /(cylinder|cone|sphere|hemisphere|hemispher|triangle|circle|radius|diameter|height of (?:the|a) (?:cone|cylinder|tower|pole|tree|ladder|building))/i.test(firstSentence);
    if (!hasUnit && !hasShapeWord) return null;
    /* these already carry a hand-built figure from the papers */
    if (q.fig) return null;
    try {
      /* composite first: if the text describes two shapes, the plain-solid
         parser must never see it, or it will draw the first one alone */
      /* the composite branch must see the WHOLE question: a two-sentence
         description ("a cone mounted on a hemisphere of radius 3·5. The height
         of the cone is 4") puts half the measurements in the second sentence */
      const comp = autoComposite(text);
      if (comp) {
        const spec = { parts: comp.parts.map(function (pt, i) {
          return { shape: pt.shape, r: pt.r, h: pt.h, role: (i === 0 ? 'base: ' : '') + pt.shape };
        }) };
        const svg = compositeSolid(spec);
        if (svg) return { svg: svg, caption: { en: 'The composite solid described in the question, drawn to its own measurements.', hi: '' } };
      }
      const solid = autoSolid(firstSentence);
      if (solid) {
        const svg = solidOf(solid);
        if (svg) return { svg: svg, caption: { en: 'The ' + solid.solid + ' described in the question, labelled with its own measurements.',
                                               hi: '' } };
      }
      const tri = autoRightTriangle(firstSentence);
      if (tri) {
        const svg = elevationOf(tri);
        if (svg) return { svg: svg, caption: { en: 'The right triangle formed by the height, the ground distance and the line of sight.',
                                               hi: '' } };
      }
      const circ = autoCircle(firstSentence);
      if (circ) {
        const svg = generic(circ);
        if (svg) return { svg: svg, caption: { en: circ.caption, hi: '' } };
      }
    } catch (e) { return null; }
    return null;
  }

  /* thin wrappers so the engine uses the SAME renderers as the hand-made
     figures instead of a second drawing implementation that could drift */
  function solidOf(p) { return solid(p); }
  function elevationOf(p) { return elevation(p); }

  function figure(ans) {
    if (!ans) return null;
    const k = ans.kind;
    const g = ans._geom || {};
    const en = (s) => ({ en: s, hi: s });

    try {
      if (k === 'composite-solid' && g && g.parts) {
        return { svg: compositeSolid(g), caption: { en: g.caption || '', hi: g.captionHi || g.caption || '' } };
      }
      if (k === 'generic' && g && g.spec) {
        return { svg: generic(g.spec), caption: { en: g.spec.caption || '', hi: g.spec.captionHi || g.spec.caption || '' } };
      }
      if (k === 'quadratic' && typeof g.a === 'number') {
        return {
          svg: parabola({ a: g.a, b: g.b, c: g.c }),
          caption: {
            en: `The parabola y = ${signPoly(g.a, g.b, g.c)} — its two intercepts on the x-axis are the roots, the dotted line is the axis of symmetry.`,
            hi: `परवलय y = ${signPoly(g.a, g.b, g.c)} — x-अक्ष पर इसके दो प्रतिच्छेद बिंदु ही मूल हैं, बिंदु-रेखा सममित अक्ष है।`
          }
        };
      }
      if (k === 'linear-pair' && typeof g.a1 === 'number') {
        return {
          svg: twoLines(g),
          caption: {
            en: 'Each equation is a straight line; the single point where they cross is the solution of the pair.',
            hi: 'प्रत्येक समीकरण एक सरल रेखा है; जहाँ वे एक बिंदु पर मिलती हैं वही युग्म का हल है।'
          }
        };
      }
      if (k === 'circumcentre' && g && (g.pts || []).length >= 3) {
        return {
          svg: circumcentreFig(g),
          caption: {
            en: 'All three vertices sit on the circle around O, and the dashed perpendicular bisectors meet exactly at O — that is why O is equidistant from A, B and C.',
            hi: 'तीनों शीर्ष O के चारों ओर के वृत्त पर हैं, और बिंदुदार लंब समद्विभाजक ठीक O पर मिलते हैं — इसीलिए O, A, B और C से समान दूरी पर है।'
          }
        };
      }
      if (k === 'distance') {
        return {
          svg: distance(g),
          caption: {
            en: 'The horizontal and vertical gaps form a right triangle — the distance is its hypotenuse.',
            hi: 'क्षैतिज और ऊर्ध्वाधर अंतर एक समकोण त्रिभुज बनाते हैं — दूरी उसका कर्ण है।'
          }
        };
      }
      if (k === 'trig-ratios') {
        return {
          svg: rightTriangle({ angle: g.angle || 'θ', opp: g.opp || 'opposite', adj: g.adj || 'adjacent', hyp: g.hyp || 'hypotenuse', tan: g.tan || 0.75, chip: g.chip, chipTitle: 'given ratio' }),
          caption: {
            en: 'Sine, cosine and tangent are just side ratios of this one triangle.',
            hi: 'ज्या, कोज्या और स्पर्शज्या इसी एक त्रिभुज की भुजा-अनुपात हैं।'
          }
        };
      }
      if (k === 'trig-evaluate' || k === 'trig-identity') {
        return {
          svg: rightTriangle({ angle: g.angle || '45°', opp: '1', adj: '1', hyp: '√2', tan: 1, chip: 'sin45 = 1/√2', chipTitle: 'standard angle' }),
          caption: {
            en: 'Every standard-angle value comes from a triangle like this (or half an equilateral triangle) — that is why 30°, 45° and 60° are exact.',
            hi: 'प्रत्येक मानक कोण का मान ऐसे ही त्रिभुज (या समबाहु त्रिभुज के आधे भाग) से आता है — इसीलिए 30°, 45°, 60° सटीक हैं।'
          }
        };
      }
      if (k === 'heights') {
        return {
          svg: elevation({ angle: g.angle || 60, height: g.height || 'h', dist: g.dist || 'd' }),
          caption: {
            en: 'The tower, the horizontal and the line of sight make a right triangle — the angle at the observer is the angle of elevation.',
            hi: 'मीनार, क्षैतिज और दृष्टि-रेखा एक समकोण त्रिभुज बनाते हैं — पर्यवेक्षक पर बना कोण उन्नयन कोण है।'
          }
        };
      }
      if (k === 'sector') {
        return {
          svg: sector({ theta: g.theta || 90, r: g.r || 'r', area: g.area, arc: g.arc }),
          caption: {
            en: 'The sector is the fraction θ/360 of the whole circle — both its area and its arc use that same fraction.',
            hi: 'त्रिज्यखंड पूरे वृत्त का θ/360 भाग है — उसका क्षेत्रफल और चाप दोनों इसी भिन्न का उपयोग करते हैं।'
          }
        };
      }
      if (k === 'mensuration') {
        return {
          svg: solid({ solid: g.solid || 'cylinder', r: g.r || 'r', h: g.h || 'h', formulas: g.formulas || ['V = πr²h', 'CSA = 2πrh', 'TSA = 2πr(r + h)'] }),
          caption: {
            en: 'Label r and h on the solid before substituting — most mensuration mistakes are radius/height mix-ups.',
            hi: 'मान रखने से पहले ठोस पर r और h अंकित कीजिए — अधिकांश भूलें त्रिज्या और ऊँचाई में उलझने से होती हैं।'
          }
        };
      }
      if (k === 'prob-dice') {
        return {
          svg: diceGrid({ target: g.target || 7 }),
          caption: {
            en: 'All 36 equally likely outcomes of two dice; the shaded cells are the favourable ones.',
            hi: 'दो पासों के सभी 36 समप्रायिक परिणाम; छायांकित कोष्ठक अनुकूल परिणाम हैं।'
          }
        };
      }
      if (k === 'probability') {
        return {
          svg: bars({ data: g.data || [{ k: 'A', v: 1 }, { k: 'B', v: 2 }, { k: 'C', v: 3 }], caption: 'favourable outcomes per event' }),
          caption: {
            en: 'Count favourable outcomes and total outcomes, then divide — probability is always that one fraction.',
            hi: 'अनुकूल और कुल परिणाम गिनिए, फिर भाग दीजिए — प्रायिकता सदैव यही एक भिन्न होती है।'
          }
        };
      }
      if (k === 'area-ratio') {
        return {
          svg: similarTriangles({ r1: g.r1 || 81, r2: g.r2 || 49, sideRatio: g.sideRatio || '√A₁ : √A₂' }),
          caption: {
            en: 'Same shape, different size: areas compare as the square of the side ratio, and altitudes in the same ratio as the sides.',
            hi: 'समान आकार, भिन्न माप: क्षेत्रफल भुजा अनुपात के वर्ग में तुलनीय होते हैं, और ऊँचाइयाँ भुजाओं के ही अनुपात में।'
          }
        };
      }
      if (k === 'bpt') {
        return {
          svg: bpt({ t: g.t || 0.4 }),
          caption: {
            en: 'DE drawn parallel to BC cuts AB and AC in the same ratio — that is the Basic Proportionality Theorem.',
            hi: 'BC के समांतर खींची गई DE, AB और AC को समान अनुपात में काटती है — यही आधारभूत समानुपातिकता प्रमेय है।'
          }
        };
      }
      if (k === 'tangent') {
        return {
          svg: tangent({ r: g.r || 'r', d: g.d || 'd', t: g.t || 't', ratio: g.ratio || 2.4 }),
          caption: {
            en: 'The radius to the point of contact is perpendicular to the tangent, so OTQ is a right triangle.',
            hi: 'स्पर्श बिंदु तक की त्रिज्या स्पर्श रेखा पर लंब होती है, अतः OTQ समकोण त्रिभुज है।'
          }
        };
      }
      if (k === 'ap') {
        return {
          svg: apLadder({ terms: g.terms || [], d: g.d || 1 }),
          caption: {
            en: 'An AP is a ladder: each rung is the previous one plus d, so the nth rung is a + (n − 1)d.',
            hi: 'समांतर श्रेढ़ी एक सीढ़ी है: हर पायदान पिछले पायदान से d अधिक है, अतः nवाँ पायदान a + (n − 1)d है।'
          }
        };
      }
      if (k === 'mean') {
        return {
          svg: meanLine({ data: g.data || [] }),
          caption: {
            en: 'The mean is the balance point of the data — the line where the values on either side cancel out.',
            hi: 'माध्य आँकड़ों का संतुलन-बिंदु है — वह रेखा जहाँ दोनों ओर के मान एक-दूसरे को काट देते हैं।'
          }
        };
      }
      if (k === 'hcf-lcm') {
        return {
          svg: factorVenn({ a: g.a || 12, b: g.b || 18 }),
          caption: {
            en: 'HCF is the product of the shared prime factors; LCM needs every factor, shared or not.',
            hi: 'म.स. साझा अभाज्य गुणनखंडों का गुणनफल है; ल.स. के लिए सभी गुणनखंड चाहिए, साझा हों या न हों।'
          }
        };
      }
      if (k === 'factorise') {
        return {
          svg: factorTree({ n: g.n || 3825 }),
          caption: {
            en: 'Break the number until every branch ends in a prime — the primes collected are the factorisation.',
            hi: 'संख्या को तोड़ते जाइए जब तक हर शाखा अभाज्य पर समाप्त न हो — मिले अभाज्य ही गुणनखंडन हैं।'
          }
        };
      }
      if (k === 'irrational') {
        return {
          svg: sqrtLine({ n: g.n || 5 }),
          caption: {
            en: '√n can be marked exactly on the number line with a right triangle — but it cannot be written as p/q.',
            hi: '√n को समकोण त्रिभुज से संख्या-रेखा पर ठीक-ठीक अंकित किया जा सकता है — पर उसे p/q के रूप में नहीं लिखा जा सकता।'
          }
        };
      }
      if (k === 'zeroes') {
        const z = g.zeroes || [];
        if (typeof g.a === 'number') {
          return {
            svg: parabola({ a: g.a, b: g.b, c: g.c }),
            caption: {
              en: 'The zeroes are exactly where the curve meets the x-axis — that is what "zero of a polynomial" means geometrically.',
              hi: 'शून्यक वही बिंदु हैं जहाँ वक्र x-अक्ष से मिलता है — "बहुपद का शून्यक" का यही ज्यामितीय अर्थ है।'
            }
          };
        }
        if (z.length === 2) {
          const a = 1, b = -(z[0] + z[1]), c = z[0] * z[1];
          return {
            svg: parabola({ a, b, c }),
            caption: {
              en: 'The zeroes are exactly where the curve meets the x-axis — that is what "zero of a polynomial" means geometrically.',
              hi: 'शून्यक वही बिंदु हैं जहाँ वक्र x-अक्ष से मिलता है — "बहुपद का शून्यक" का यही ज्यामितीय अर्थ है।'
            }
          };
        }
        return null;
      }
      if (k === 'topic' || k === 'concept' || k === 'fallback') {
        const items = (ans.approaches || []).map((a2) => (a2.name && (a2.name.en || a2.name)) || '').filter(Boolean);
        if (items.length >= 3) {
          return {
            svg: conceptMap({ center: g.center || (ans.title && ans.title.en) || 'topic', items }),
            caption: {
              en: 'How the ideas in this topic connect — read the centre first, then the branches.',
              hi: 'इस अवधारणा के विचार आपस में कैसे जुड़े हैं — पहले केंद्र पढ़िए, फिर शाखाएँ।'
            }
          };
        }
        return null;
      }
    } catch (e) { return null; }
    return null;
  }


  /* =========================================================
     Two solid hemispheres of equal radius r joined at ONE POINT,
     curved surfaces touching.

     Geometry matters here, so it is drawn the way the object sits:
     one hemisphere upside-down on top (flat face up, dome hanging
     down), one the right way up below (flat face down, dome rising).
     The two domes meet at a single point, and BOTH flat circular
     faces stay exposed -- which is the whole reason the answer is
     6πr² and not 4πr².

     Drawing the two arcs side by side is the trap: two semicircles
     across one diameter merge into a single circle and the picture
     silently becomes "a sphere".  Stacked dome-to-dome cannot be
     misread.
     ========================================================= */
  function twoHemispheres(p) {
    const rLabel = (p && p.r != null) ? p.r : 'r';
    const joined = !p || p.joined !== 'base';
    const W = 640, H = 400;
    const cx = 232;
    const R = 96;                     /* drawn radius */
    const ry = R * 0.26;              /* flat faces, seen at a slight angle */
    const gap = 168;                  /* centre-line distance between the two flat faces */

    const topY = 156 - gap / 2;       /* flat face of the upper hemisphere */
    const botY = 156 + gap / 2;       /* flat face of the lower hemisphere */
    const meet = (topY + botY) / 2;   /* the point where the domes touch */

    let body = '';
    let rows;

    if (joined) {
      /* upper hemisphere: flat face on top, dome hanging down to the meeting point */
      body += `<path d="M${cx - R} ${topY} A ${R} ${R} 0 0 0 ${cx + R} ${topY} Z"
        fill="${C.skySoft}" fill-opacity="0.8" stroke="${C.sky}" stroke-width="2.4"/>`;
      body += `<ellipse cx="${cx}" cy="${topY}" rx="${R}" ry="${ry}"
        fill="${C.creamMid}" stroke="${C.creamDeep}" stroke-width="2"/>`;

      /* lower hemisphere: flat face on the bottom, dome rising to the same point */
      body += `<path d="M${cx - R} ${botY} A ${R} ${R} 0 0 1 ${cx + R} ${botY} Z"
        fill="${C.skySoft}" fill-opacity="0.8" stroke="${C.sky}" stroke-width="2.4"/>`;
      body += `<ellipse cx="${cx}" cy="${botY}" rx="${R}" ry="${ry}"
        fill="${C.creamMid}" stroke="${C.creamDeep}" stroke-width="2"/>`;

      /* the single point of contact */
      body += `<circle cx="${cx}" cy="${meet}" r="5" fill="${C.red}" stroke="${C.white}" stroke-width="1.8"/>`;
      /* annotate to the left, where there is empty space -- putting it on the
         right ran straight through the legend */
      body += `<line x1="${cx - 12}" y1="${meet}" x2="${cx - 54}" y2="${meet}"
        stroke="${C.red}" stroke-width="1.3" stroke-dasharray="4 3"/>`;
      body += label(cx - 58, meet + 4, 'one point of contact',
        { fill: C.red, size: 11.5, weight: 700, anchor: 'end' });

      /* radius on each dome */
      body += `<line x1="${cx}" y1="${meet}" x2="${cx - R * 0.62}" y2="${meet - R * 0.62}"
        stroke="${C.skyDeep}" stroke-width="1.8" stroke-dasharray="5 3"/>`;
      body += label(cx - R * 0.40, meet - R * 0.40, rLabel, { fill: C.skyDeep, size: 13, weight: 700 });
      body += `<line x1="${cx}" y1="${meet}" x2="${cx - R * 0.62}" y2="${meet + R * 0.62}"
        stroke="${C.skyDeep}" stroke-width="1.8" stroke-dasharray="5 3"/>`;
      body += label(cx - R * 0.40, meet + R * 0.40 + 4, rLabel, { fill: C.skyDeep, size: 13, weight: 700 });

      rows = [['2 curved caps', '2 × 2πr²', C.sky],
              ['2 flat faces', '2 × πr²', C.creamDeep]];
    } else {
      /* flat faces glued: one solid sphere, the join hidden inside */
      body += `<circle cx="${cx}" cy="${meet}" r="${R}" fill="${C.skySoft}" fill-opacity="0.8"
        stroke="${C.sky}" stroke-width="2.4"/>`;
      body += `<ellipse cx="${cx}" cy="${meet}" rx="${R}" ry="${ry}" fill="none"
        stroke="${C.creamDeep}" stroke-width="2" stroke-dasharray="6 4"/>`;
      body += `<line x1="${cx}" y1="${meet}" x2="${cx + R * 0.7}" y2="${meet - R * 0.7}"
        stroke="${C.skyDeep}" stroke-width="1.8" stroke-dasharray="5 3"/>`;
      body += label(cx + R * 0.46, meet - R * 0.46, rLabel, { fill: C.skyDeep, size: 13, weight: 700 });
      rows = [['2 curved caps', '2 × 2πr²', C.sky],
              ['2 flat faces', 'hidden — glued', C.inkSoft]];
    }

    /* the surface inventory, well clear of the drawing */
    const px = 452;
    let py = 108;
    body += label(px, py - 26, 'surface exposed', { fill: C.inkSoft, size: 10.5, anchor: 'start', weight: 700 });
    rows.forEach(function (row) {
      body += `<rect x="${px}" y="${py - 11}" width="12" height="12" rx="3" fill="${row[2]}"/>`;
      body += label(px + 20, py, row[0], { fill: C.ink, size: 12, anchor: 'start' });
      body += label(px + 20, py + 15, row[1], { fill: row[2], size: 11.5, anchor: 'start', weight: 700 });
      py += 52;
    });
    body += `<line x1="${px}" y1="${py - 18}" x2="${W - 26}" y2="${py - 18}" stroke="${C.line}" stroke-width="1.4"/>`;
    body += label(px, py + 6, joined ? 'Total' : 'Total', { fill: C.ink, size: 12, anchor: 'start', weight: 700 });
    body += label(px, py + 30, joined ? '4πr² + 2πr²' : '4πr²', { fill: C.green, size: 15, anchor: 'start', weight: 700 });
    body += label(px, py + 54, joined ? '= 6πr²' : '= 4πr²', { fill: C.green, size: 15, anchor: 'start', weight: 700 });

    return wrap(W, H, body);
  }

  /* =====================================================================
     Simple schematic chemistry apparatus. The model passes an `apparatus`
     list, e.g. [{kind:"beaker", fill:"blue liquid"}, {kind:"flame"}];
     unknown kinds are skipped. For balance/reaction questions that don't
     describe an apparatus, we return a generic "balanced equation" badge.
     ===================================================================== */
  function apparatusFig(spec) {
    const W=560, H=320;
    const parts = Array.isArray(spec.apparatus) ? spec.apparatus : (Array.isArray(spec.parts) ? spec.parts : []);
    let inner = '';
    // bench line
    inner += `<line x1="40" y1="280" x2="520" y2="280" stroke="${C.line}" stroke-width="1.6"/>`;

    // Draw items in order with simple x placement
    let x = 120;
    const spaced = 140;
    const labels = [];

    function drawBeaker(x, opts) {
      // Beaker: a cup shape with a top lip
      const fillH = opts && opts.fillLevel ? Math.max(20, Math.min(110, Number(opts.fillLevel)*110)) : 60;
      const liquid = opts && opts.color ? opts.color : C.skyMid;
      const yBase = 280, yTop = 150, yLiquid = yBase - fillH;
      let s = `<path d="M${x-45},${yTop} L${x+45},${yTop} L${x+40},${yBase} L${x-40},${yBase} Z" fill="${C.white}" stroke="${C.ink}" stroke-width="2"/>`;
      s += `<path d="M${x-45},${yTop} L${x-52},${yTop-12} M${x+45},${yTop} L${x+52},${yTop-12}" stroke="${C.ink}" stroke-width="2" fill="none"/>`;
      if (fillH > 0) s += `<path d="M${x-40+0.8},${yLiquid} L${x+40-0.8},${yLiquid} L${x+40},${yBase} L${x-40},${yBase} Z" fill="${liquid}" opacity="0.55"/>`;
      s += `<line x1="${x-50}" y1="${yTop+30}" x2="${x+50}" y2="${yTop+30}" stroke="${C.line}" stroke-width="1" stroke-dasharray="3 3"/>`;
      return s;
    }
    function drawTube(x, opts) {
      const fillH = opts && opts.fillLevel ? Math.max(15, Math.min(90, Number(opts.fillLevel)*90)) : 0;
      const liquid = opts && opts.color ? opts.color : C.skyMid;
      // Test tube: open-topped U shape
      let s = `<path d="M${x-18},90 L${x-18},250 A18,18 0 0 0 ${x+18},250 L${x+18},90" fill="${C.white}" stroke="${C.ink}" stroke-width="2"/>`;
      s += `<line x1="${x-25}" y1="90" x2="${x+25}" y2="90" stroke="${C.ink}" stroke-width="2"/>`;
      if (fillH>0) {
        const yLiq = 250 - fillH;
        s += `<path d="M${x-17.5},${yLiq} L${x+17.5},${yLiq} L${x+17.5},250 A18,18 0 0 1 ${x-17.5},250 Z" fill="${liquid}" opacity="0.55"/>`;
      }
      // clamp
      s += `<path d="M${x-30},130 L${x-45},130 M${x-30},140 L${x-45},140 M${x+30},130 L${x+45},130 M${x+30},140 L${x+45},140" stroke="${C.inkSoft}" stroke-width="1.8"/>`;
      return s;
    }
    function drawFlask(x, opts) {
      // Conical flask: narrow neck widening to a flat base
      const liquid = opts && opts.color ? opts.color : C.skyMid;
      const fillH = opts && opts.fillLevel ? Math.max(10, Math.min(80, Number(opts.fillLevel)*80)) : 40;
      const yBase = 280, yNeck = 160, yTop = 120, bodyW = 90;
      let s = `<path d="M${x-15},${yTop} L${x+15},${yTop} L${x+15},${yNeck} L${x+bodyW},${yBase} L${x-bodyW},${yBase} L${x-15},${yNeck} Z" fill="${C.white}" stroke="${C.ink}" stroke-width="2"/>`;
      if (fillH>0) {
        const yLiq = yBase - fillH;
        // crude fill at bottom
        const wAt = (y) => (yBase-y)/(yBase-yNeck)*(bodyW-15)+15;
        const w = wAt(yLiq);
        s += `<path d="M${x-w},${yLiq} L${x+w},${yLiq} L${x+bodyW-3},${yBase} L${x-bodyW+3},${yBase} Z" fill="${liquid}" opacity="0.55"/>`;
      }
      return s;
    }
    function drawBurner(x) {
      let s = `<rect x="${x-22}" y="248" width="44" height="32" rx="3" fill="${C.white}" stroke="${C.ink}" stroke-width="1.6"/>`;
      s += `<path d="M${x},248 C${x-14},220 ${x+14},220 ${x},195 C${x-8},218 ${x+8},218 ${x},242 Z" fill="#f5b14a" opacity="0.85"/>`;
      s += `<path d="M${x},248 C${x-8},228 ${x+8},228 ${x},212" fill="#f1d36a" opacity="0.9"/>`;
      s += `<rect x="${x-6}" y="280" width="12" height="6" fill="${C.inkSoft}"/>`;
      labels.push({x:x,y:260,t:'बर्नर',en:'burner'});
      return s;
    }
    function drawArrow(x1,y1,x2,y2){
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${C.ink}" stroke-width="1.8" marker-end="url(#arr)"/>`;
    }
    function drawPlus(x,y){ return label(x,y,'+',{size:20,fill:C.ink,weight:700}); }
    function drawArrowSym(x,y){ return label(x,y,'→',{size:22,fill:C.green,weight:700}); }

    // If no parts specified (e.g. balance equation), draw reagents -> products schematic
    if (!parts.length) {
      // show a generic "balanced equation" visual: left cup + right cup on a balance
      inner += `<line x1="180" y1="90" x2="380" y2="90" stroke="${C.ink}" stroke-width="2"/>`;
      inner += `<line x1="280" y1="90" x2="280" y2="220" stroke="${C.ink}" stroke-width="2"/>`;
      inner += `<path d="M180,90 L150,140 L210,140 Z" fill="${C.skySoft}" stroke="${C.sky}" stroke-width="1.8"/>`;
      inner += `<path d="M380,90 L350,140 L410,140 Z" fill="${C.green}33" stroke="${C.green}" stroke-width="1.8"/>`;
      inner += `<line x1="230" y1="220" x2="330" y2="220" stroke="${C.ink}" stroke-width="2"/>`;
      inner += label(180,175,'अभिकारक',{size:12,fill:C.skyDeep});
      inner += label(380,175,'उत्पाद',{size:12,fill:C.green});
      labels.push({x:280,y:260,t:'संतुलित समीकरण',en:'balanced equation'});
    } else {
      parts.forEach((p,i) => {
        const kind = String(p.kind || p.shape || '').toLowerCase();
        if (kind === 'beaker') { inner += drawBeaker(x,p); labels.push({x:x,y:300,t:p.label||'बीकर',en:p.label||'beaker'}); x+=spaced; }
        else if (kind === 'test-tube' || kind === 'tube') { inner += drawTube(x,p); labels.push({x:x,y:80,t:p.label||'परखनली',en:p.label||'test tube'}); x+=spaced; }
        else if (kind === 'flask') { inner += drawFlask(x,p); labels.push({x:x,y:300,t:p.label||'फ्लास्क',en:p.label||'flask'}); x+=spaced; }
        else if (kind === 'burner' || kind === 'flame') { inner += drawBurner(x); x+=spaced; }
        else if (kind === 'plus') { inner += drawPlus(x-30, 220); x+=60; }
        else if (kind === 'arrow') { inner += drawArrowSym(x-30, 200); x+=60; }
        else { x+=spaced*0.6; }
      });
    }
    // arrow marker
    inner = `<defs><marker id="arr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="${C.ink}"/></marker></defs>` + inner;
    labels.forEach(l=>{ inner += label(l.x,l.y,l.t,{size:11,fill:C.inkSoft}); });
    if (spec.caption) inner += label(280,310,spec.caption,{size:11.5,fill:C.ink,weight:600});
    return wrap(W,H,inner);
  }

  /* Simple optics (convex/concave lens + principal axis) */
  function opticsFig(spec) {
    const W=560,H=280;
    const cx=280,cy=160;
    let inner = `<line x1="40" y1="${cy}" x2="520" y2="${cy}" stroke="${C.line}" stroke-width="1.4"/>`; // principal axis
    const lensType = String(spec.lens || spec.shape || 'convex').toLowerCase();
    if (lensType === 'concave') {
      inner += `<path d="M${cx-8},60 C${cx+14},80 ${cx+14},240 ${cx-8},260" stroke="${C.violet}" stroke-width="3" fill="none"/>`;
    } else {
      inner += `<path d="M${cx-8},60 C${cx-28},110 ${cx-28},210 ${cx-8},260 M${cx+8},60 C${cx+28},110 ${cx+28},210 ${cx+8},260" stroke="${C.sky}" stroke-width="3" fill="${C.skySoft}" opacity="0.5"/>`;
    }
    // F, 2F
    inner += `<line x1="${cx}" y1="50" x2="${cx}" y2="270" stroke-dasharray="3 3" stroke="${C.line}"/>`;
    inner += dot(cx-80,cy,4,C.creamDeep); label(cx-80,cy-10,'F',{size:12,fill:C.creamDeep});
    inner += dot(cx+80,cy,4,C.creamDeep); label(cx+80,cy-10,'F′',{size:12,fill:C.creamDeep});
    // sample ray (parallel -> through F)
    inner += `<line x1="120" y1="${cy-40}" x2="${cx}" y2="${cy-40}" stroke="${C.red}" stroke-width="1.8"/>`;
    inner += `<line x1="${cx}" y1="${cy-40}" x2="${cx+80}" y2="${cy}" stroke="${C.red}" stroke-width="1.8"/>`;
    if (spec.caption) inner += label(280,300,spec.caption,{size:11.5,weight:600});
    else inner += label(280,300,'प्रकाश किरणें / light rays',{size:11,fill:C.inkSoft});
    return wrap(W,H,inner);
  }

  /* Very simple series circuit (battery + resistor) */
  function circuitFig(spec) {
    const W=560,H=260;
    const cx=280,cy=130;
    let inner = `<rect x="120" y="60" width="320" height="140" fill="none" stroke="${C.ink}" stroke-width="2"/>`;
    // battery symbol on left side
    const bx=120;
    inner += `<line x1="${bx}" y1="100" x2="${bx}" y2="120" stroke="${C.ink}" stroke-width="2"/>`;
    inner += `<line x1="${bx-12}" y1="120" x2="${bx+12}" y2="120" stroke="${C.ink}" stroke-width="3"/>`;
    inner += `<line x1="${bx-6}" y1="130" x2="${bx+6}" y2="130" stroke="${C.ink}" stroke-width="1.8"/>`;
    inner += `<line x1="${bx}" y1="130" x2="${bx}" y2="160" stroke="${C.ink}" stroke-width="2"/>`;
    // resistor on top (zig-zag)
    const rx=260,rw=80;
    let zz = `<polyline points="`;
    for(let i=0;i<=rw;i+=8){ zz += `${rx+i},${(i%16===0)?50:70} `; }
    zz += `" fill="none" stroke="${C.ink}" stroke-width="2"/>`;
    // gap in top line for resistor
    inner += `<line x1="120" y1="60" x2="${rx}" y2="60" stroke="${C.ink}" stroke-width="2"/>`;
    inner += `<line x1="${rx+rw}" y1="60" x2="440" y2="60" stroke="${C.ink}" stroke-width="2"/>`;
    inner += zz;
    label(cx,30,'R',{size:13,weight:700,fill:C.ink});
    label(100,128,'+',{size:16,weight:700,fill:C.green});
    label(100,138,'−',{size:16,weight:700,fill:C.red});
    // current arrow
    inner += `<line x1="200" y1="80" x2="230" y2="80" stroke="${C.skyDeep}" stroke-width="2" marker-end="url(#arr)"/>`;
    inner = `<defs><marker id="arr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="${C.skyDeep}"/></marker></defs>` + inner;
    if (spec.caption) inner += label(280,240,spec.caption,{size:11.5,weight:600});
    else inner += label(280,240,'विद्युत परिपथ / electric circuit',{size:11,fill:C.inkSoft});
    return wrap(W,H,inner);
  }

  /* Inclined-plane / pulley / simple pendulum */
  function mechanicsFig(spec) {
    const W=560,H=280;
    const kind=String(spec.mechanism||spec.type||'incline').toLowerCase();
    let inner = `<line x1="40" y1="240" x2="520" y2="240" stroke="${C.line}" stroke-width="1.4"/>`;
    if (kind==='pendulum') {
      const px=280,py=60,bx=280+60,by=200;
      inner += `<rect x="${px-40}" y="${py-10}" width="80" height="10" fill="${C.ink}"/>`;
      inner += `<line x1="${px}" y1="${py}" x2="${bx}" y2="${by}" stroke="${C.ink}" stroke-width="2"/>`;
      inner += `<circle cx="${bx}" cy="${by}" r="14" fill="${C.skySoft}" stroke="${C.sky}" stroke-width="2"/>`;
      inner += `<path d="M${px},${py} Q${bx-10},${(py+by)/2} ${bx},${by}" fill="none" stroke="${C.creamDeep}" stroke-width="1.6" stroke-dasharray="4 4"/>`;
      label(bx+24,by,'m (गोलक)',{size:11,anchor:'start'});
    } else {
      // incline
      inner += `<path d="M120,240 L400,90 L400,240 Z" fill="${C.skySoft}" stroke="${C.sky}" stroke-width="2"/>`;
      inner += `<rect x="240" y="170" width="40" height="28" fill="${C.creamMid}" stroke="${C.creamDeep}" stroke-width="1.8"/>`;
      label(260,160,'वस्तु / block',{size:11});
    }
    if (spec.caption) inner += label(280,270,spec.caption,{size:11.5,weight:600});
    return wrap(W,H,inner);
  }

  /* Biology: simple leaf outline, or a cell/flower/organ silhouette (very schematic) */
  function biologyFig(spec) {
    const W=560,H=300;
    const kind=String(spec.kind||spec.type||'leaf').toLowerCase();
    let inner='';
    if (kind==='cell') {
      inner += `<rect x="160" y="70" width="240" height="160" rx="16" fill="#e8f2ea" stroke="${C.green}" stroke-width="2"/>`;
      inner += `<circle cx="280" cy="150" r="26" fill="${C.cream}" stroke="${C.creamDeep}" stroke-width="2"/>`;
      label(280,155,'केन्द्रक',{size:11,weight:600});
      inner += `<ellipse cx="220" cy="120" rx="22" ry="12" fill="#cfe6d3" stroke="${C.green}"/>`;
      inner += `<ellipse cx="340" cy="180" rx="22" ry="12" fill="#cfe6d3" stroke="${C.green}"/>`;
      label(220,100,'हरितलवक',{size:10,fill:C.green});
      label(280,260,'कोशिका / cell',{size:12,weight:600});
    } else if (kind==='flower') {
      const cx=280,cy=150;
      for(let a=0;a<360;a+=60){
        const th=a*Math.PI/180;
        const x=cx+Math.cos(th)*50,y=cy+Math.sin(th)*50;
        inner += `<ellipse cx="${num(x)}" cy="${num(y)}" rx="40" ry="22" fill="#fbe6e6" stroke="${C.red}" stroke-width="1.8" transform="rotate(${a} ${num(x)} ${num(y)})"/>`;
      }
      inner += `<circle cx="${cx}" cy="${cy}" r="18" fill="${C.cream}" stroke="${C.creamDeep}" stroke-width="2"/>`;
      label(cx,260,'पुष्प / flower',{size:12,weight:600});
    } else if (kind==='organ' || kind==='heart') {
      inner += `<path d="M280,90 C220,70 190,140 280,220 C370,140 340,70 280,90 Z" fill="#f7d7d2" stroke="${C.red}" stroke-width="2"/>`;
      inner += `<path d="M280,100 L280,210" stroke="${C.red}" stroke-width="1" stroke-dasharray="2 2"/>`;
      label(280,260,'हृदय / heart',{size:12,weight:600});
    } else {
      // leaf
      inner += `<path d="M180,150 Q280,50 380,150 Q280,250 180,150 Z" fill="${C.green}33" stroke="${C.green}" stroke-width="2"/>`;
      inner += `<line x1="180" y1="150" x2="380" y2="150" stroke="${C.green}" stroke-width="1.6"/>`;
      for(let i=0;i<6;i++){
        const t=(i+1)/7, x=180+200*t, y=150;
        inner += `<path d="M${num(x)},${num(y)} Q${num(x+18)},${num(y-30-i*2)} ${num(x+30)},${num(y-50-i*3)}" stroke="${C.green}" stroke-width="1.2" fill="none"/>`;
        inner += `<path d="M${num(x)},${num(y)} Q${num(x+18)},${num(y+30+i*2)} ${num(x+30)},${num(y+50+i*3)}" stroke="${C.green}" stroke-width="1.2" fill="none"/>`;
      }
      label(280,270,'पत्ती / leaf',{size:12,weight:600});
    }
    return wrap(W,H,inner);
  }

  return { autoFigureFor, autoSolid, autoComposite, figure, generic, compositeSolid, twoHemispheres, parabola, twoLines, distance, rightTriangle, elevation, sector, solid, diceGrid, similarTriangles, bpt, tangent, diamTangents, apLadder, meanLine, factorVenn, factorTree, sqrtLine, conceptMap, bars, apparatusFig, opticsFig, circuitFig, mechanicsFig, biologyFig };
})();
