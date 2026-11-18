/* =====================================================================
   Upay · worked figures

   Two numerical families where a figure is only honest if it is drawn
   from the question's own numbers AND labelled with the answer those
   numbers produce:

     1. Heights and distances — one or two observations, angle of elevation
     2. Resistor networks — all in series, all in parallel, or one parallel
        pair in series with a third resistor, with a battery voltage

   Nothing here calls a model and nothing is copied out of the AI's prose:
   every labelled value is computed from the question text. When the
   wording is ambiguous this returns null, because a figure that is only
   half-right teaches the wrong thing.
   ===================================================================== */
(function (root) {
  'use strict';
  const UP = (root.UP = root.UP || {});

  const DEG = '[\\u00b0\\u00ba\\u2218]';                 /* ° º ∘ */
  const METRE = '(?:m|metres?|meters?)\\b';

  /* Pasted questions often repeat a unit token ("30∘30∘", "6 Ω6Ω", "12 V12 V").
     Collapse that repetition before reading values, or one resistor becomes
     two and the whole network parse shifts. */
  function normalise(text) {
    return String(text == null ? '' : text)
      .normalize('NFC')
      .replace(/[\u2212\u2013\u2014]/g, '-')
      .replace(/\u00a0/g, ' ')
      .replace(new RegExp('(\\d+(?:\\.\\d+)?)\\s*(' + DEG + ')\\s*\\1\\s*(?:' + DEG + ')', 'g'), '$1$2')
      .replace(/(\d+(?:\.\d+)?)\s*(k|M)?\s*(?:Ω|ohms?)\s*\1\s*(k|M)?\s*(?:Ω|ohms?)/gi,
        (whole, value, mult) => value + ' ' + (mult || '') + 'Ω')
      .replace(/(\d+(?:\.\d+)?)\s*(?:V|volts?)\s*\1\s*(?:V|volts?)/gi, (whole, value) => value + ' V')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* ------------------------------------------------------- number text */

  function decimal(v) {
    if (!isFinite(v)) return '';
    const rounded = Math.abs(v) >= 100 ? v.toFixed(1) : v.toFixed(2);
    return String(Number(rounded));
  }

  /* Small-denominator rational approximation: 2/3 stays 2/3, not 0.67. */
  function rational(v, maxDen) {
    let best = null;
    for (let q = 1; q <= (maxDen || 12); q++) {
      const p = Math.round(v * q);
      if (!p) continue;
      if (Math.abs(v - p / q) <= 1e-9 * Math.max(1, Math.abs(v))) {
        if (!best || q < best.q) best = { p: p, q: q };
        if (Math.abs(v - p / q) === 0) break;
      }
    }
    return best;
  }

  /* p/q · √k for the roots CBSE answers actually contain. */
  function rootForm(v) {
    if (!isFinite(v) || v === 0) return null;
    const roots = [1, 2, 3, 5, 6, 7, 10, 11, 13];
    for (const k of roots) {
      const r = rational(v / Math.sqrt(k), 12);
      if (r) return { p: r.p, q: r.q, k: k };
    }
    return null;
  }

  function rootText(p, q, k) {
    const sign = p < 0 ? '−' : '';
    const P = Math.abs(p);
    if (k === 1) return q === 1 ? sign + P : sign + P + '/' + q;
    const radical = (P === 1 ? '' : String(P)) + '√' + k;
    return q === 1 ? sign + radical : sign + radical + '/' + q;
  }

  function exact(v) {
    const r = rootForm(v);
    return r ? rootText(r.p, r.q, r.k) : '';
  }

  /* "10√3 m ≈ 17.32 m" — the exact form first, because that is the answer
     the marking scheme expects, then a decimal a student can picture. */
  function withUnit(v, unit) {
    const d = decimal(v), e = exact(v);
    if (!d) return '';
    if (!e || e === d) return d + ' ' + unit;
    return e + ' ' + unit + ' ≈ ' + d + ' ' + unit;
  }

  function withUnitExactFirst(v, unit) {
    const d = decimal(v), e = exact(v);
    if (!d) return '';
    return (e && e !== d ? e : d) + ' ' + unit;
  }

  /* ------------------------------------------------- heights & distances */

  function anglesIn(t) {
    const out = [];
    const re = new RegExp('(\\d+(?:\\.\\d+)?)\\s*(?:' + DEG + '|deg(?:rees?)?\\b)', 'gi');
    let m;
    while ((m = re.exec(t))) {
      const v = Number(m[1]);
      if (v > 0 && v < 90) out.push(v);
    }
    return [...new Set(out)].sort((a, b) => a - b);
  }

  function number(re, t) {
    const m = t.match(re);
    return m ? Number(m[1]) : null;
  }

  function heightsAndDistances(text) {
    const t = normalise(text);
    if (!/angle of (?:elevation|depression)|\b(?:elevation|depression)\b/i.test(t)) return null;
    /* A depression question is the mirror image: the observer is on top and
       the angle is measured below the horizontal. This renderer only draws
       ground-level observations, so it refuses rather than flips the picture. */
    if (/depression/i.test(t)) return null;
    if (!/\b(?:tower|building|tree|pole|flagstaff|chimney|lighthouse|minar|mast|cliff|monument|antenna|statue|pillar|temple)\b/i.test(t)) return null;
    /* A ladder, a shadow, a boat or a second object is a different diagram. */
    if (/ladder|staircase|stairway|slide|ramp|shadow|\bboat\b|\bship\b|aeroplane|airplane|balloon|\bkite\b|two towers|another tower|both towers|second tower|two buildings|another building|two poles|two trees/i.test(t)) return null;

    const angles = anglesIn(t);
    const walked = number(/(?:walk\w*|mov(?:e|es|ed|ing)|advanc\w*|proceed\w*|covers?|covered)\b[^.]{0,70}?(\d+(?:\.\d+)?)\s*(?:m|metres?|meters?)\b/i, t)
      ?? number(new RegExp('(\\d+(?:\\.\\d+)?)\\s*' + METRE + '[^.]{0,50}?(?:towards?|toward|nearer|closer)', 'i'), t);
    const away = number(/(\d+(?:\.\d+)?)\s*(?:m|metres?|meters?)\b[^.]{0,60}?(?:away from the foot|away from its foot|away from the base|from the foot|from its foot|from the base|away from)/i, t)
      ?? number(/(?:distance of|away\s+)\s*(\d+(?:\.\d+)?)\s*(?:m|metres?|meters?)\b/i, t);
    const givenHeight = number(/(\d+(?:\.\d+)?)\s*(?:m|metres?|meters?)\s*(?:high|tall)\b/i, t)
      ?? number(/(?:tower|building|tree|pole|flagstaff|chimney|cliff|statue|pillar)?\s*(?:height|tall|high)\s*(?:of|is|=)?\s*(\d+(?:\.\d+)?)\s*(?:m|metres?|meters?)\b/i, t);

    let height = null, far = null, near = null, heightGiven = false;
    let angleFar = null, angleNear = null;

    if (angles.length >= 2) {
      if (angles.length > 2 || !walked) return null;
      const a1 = angles[0], a2 = angles[1];
      if (a2 - a1 < 1) return null;
      const t1 = Math.tan(a1 * Math.PI / 180), t2 = Math.tan(a2 * Math.PI / 180);
      height = walked * t1 * t2 / (t2 - t1);
      far = height / t1;
      near = height / t2;
      angleFar = a1; angleNear = a2;
      /* The walked distance must be the gap between the two observations. */
      if (Math.abs((far - near) - walked) > 1e-6 * Math.max(1, far)) return null;
    } else if (angles.length === 1) {
      if (!!away === !!givenHeight) return null;   /* neither given, or both given */
      if (away) {
        angleFar = angles[0];
        height = away * Math.tan(angles[0] * Math.PI / 180);
        far = away;
      } else {
        angleNear = angles[0];
        height = givenHeight;
        heightGiven = true;
        far = height / Math.tan(angles[0] * Math.PI / 180);
      }
    } else {
      return null;
    }

    if (!isFinite(height) || !isFinite(far) || !(height > 0) || !(far > 0)) return null;
    /* Refuse absurd proportions: they mean a number was taken from the wrong
       place in the sentence (a period, a date, a part number). */
    const span = walked || far;
    if (height / span > 60 || height / span < 0.02) return null;
    if (near != null && !(near > 0 && near < far)) return null;

    const answer = [], chip = [];
    if (heightGiven) {
      answer.push('Height given: ' + withUnitExactFirst(height, 'm'));
      answer.push('Distance from the point to the base: ' + withUnit(far, 'm'));
      chip.push('h = ' + withUnitExactFirst(height, 'm') + ' (given)');
      chip.push('point → base = ' + withUnit(far, 'm'));
    } else if (near != null) {
      answer.push('Height of the tower: ' + withUnit(height, 'm'));
      answer.push('Original distance (P to base): ' + withUnit(far, 'm'));
      answer.push('Nearer distance (Q to base): ' + withUnit(near, 'm'));
      chip.push('h = ' + withUnit(height, 'm'));
      chip.push('P → base = ' + withUnit(far, 'm'));
      chip.push('Q → base = ' + withUnit(near, 'm'));
    } else {
      answer.push('Height of the tower: ' + withUnit(height, 'm'));
      answer.push('Distance from the point to the base: ' + withUnit(far, 'm'));
      chip.push('h = ' + withUnit(height, 'm'));
      chip.push('point → base = ' + withUnit(far, 'm'));
    }

    const givenBits = [];
    if (angleFar != null) givenBits.push(angleFar + '°');
    if (angleNear != null) givenBits.push(angleNear + '°');
    if (walked) givenBits.push(walked + ' m walked');

    return {
      type: 'elevation', verified: true,
      angleFar: angleFar, angleNear: angleNear, walked: walked,
      height: height, farDistance: far, nearDistance: near, heightGiven: heightGiven,
      answer: answer, chip: chip,
      /* Values the written answer should repeat; used only for a mismatch note. */
      checkText: [withUnitExactFirst(height, 'm'), decimal(height), exact(height)].filter(Boolean),
      computed: { height: height, farDistance: far, nearDistance: near },
      caption: 'Drawn to scale from the question\'s own values (' + givenBits.join(', ') +
        '). Height and distances are calculated here, not copied from the written answer. This is a schematic, not the paper\'s figure.'
    };
  }

  /* --------------------------------------------------- resistor networks */

  function resistorValues(t) {
    const out = [];
    const re = /(\d+(?:\.\d+)?)\s*(k|M)?\s*(?:Ω|ohms?\b|ohm\b)/gi;
    let m;
    while ((m = re.exec(t))) {
      const scale = m[2] === 'k' ? 1000 : m[2] === 'M' ? 1000000 : 1;
      out.push({ value: Number(m[1]) * scale, index: m.index });
    }
    return out;
  }

  /* The clause a keyword sits in, bounded by sentence separators. */
  function clauseAround(t, at) {
    let start = 0, end = t.length;
    for (const sep of ['.', ';', ',']) {
      const before = t.lastIndexOf(sep, at);
      if (before > start) start = before;
      const after = t.indexOf(sep, at);
      if (after >= 0 && after < end) end = after;
    }
    return [start, end];
  }

  /* Which two of three resistors form the parallel pair.

     Only one arrangement is drawn: a pair in parallel, that pair in series
     with the third resistor. The wording decides which is which — and when
     it describes the mirror arrangement ("A and B in series, in parallel
     with C") the parser refuses, because the drawing would then show a
     different circuit from the one asked. */
  function mixedPair(t, found) {
    const pIdx = t.search(/parallel/i), sIdx = t.search(/series/i);
    if (pIdx < 0 || sIdx < 0) return null;
    if (pIdx < sIdx) {
      const [start, end] = clauseAround(t, pIdx);
      const inside = found.filter(r => r.index >= start && r.index <= end).map(r => found.indexOf(r));
      if (inside.length !== 2) return null;
      const third = [0, 1, 2].filter(i => !inside.includes(i));
      /* the left-out resistor must be the one introduced by "in series" */
      if (third.length !== 1 || found[third[0]].index < sIdx) return null;
      return inside;
    }
    /* "… in series with a parallel combination of X and Y" */
    const before = found.filter(r => r.index < sIdx).map(r => found.indexOf(r));
    const after = found.filter(r => r.index > pIdx).map(r => found.indexOf(r));
    return before.length === 1 && after.length === 2 ? after : null;
  }

  function computeNetwork(layout, values, pairIdx, battery) {
    const labels = ['R₁', 'R₂', 'R₃'];
    const r = values.map((v, i) => ({ label: labels[i], value: v, current: null, voltage: null }));
    let equivalent = null, totalCurrent = null, blocks = [], note = '';

    if (layout === 'series') {
      equivalent = r.reduce((a, x) => a + x.value, 0);
      blocks = [{ kind: 'series', resistors: r }];
    } else if (layout === 'parallel') {
      equivalent = 1 / r.reduce((a, x) => a + 1 / x.value, 0);
      blocks = [{ kind: 'parallel', resistors: r }];
    } else {
      const a = r[pairIdx[0]], b = r[pairIdx[1]];
      const series = r.filter(x => x !== a && x !== b)[0];
      const rp = (a.value * b.value) / (a.value + b.value);
      equivalent = rp + series.value;
      blocks = [{ kind: 'series', resistors: [series] }, { kind: 'parallel', resistors: [a, b], equivalent: rp }];
      note = a.label + ' and ' + b.label + ' are in parallel; that pair is in series with ' + series.label;
    }

    if (battery) {
      totalCurrent = battery / equivalent;
      if (layout === 'parallel') {
        r.forEach(x => { x.voltage = battery; x.current = battery / x.value; });
      } else if (layout === 'series') {
        r.forEach(x => { x.current = totalCurrent; x.voltage = totalCurrent * x.value; });
      } else {
        const series = blocks[0].resistors[0];
        const pair = blocks[1];
        series.current = totalCurrent;
        series.voltage = totalCurrent * series.value;
        pair.voltage = totalCurrent * pair.equivalent;
        pair.resistors.forEach(x => { x.voltage = pair.voltage; x.current = pair.voltage / x.value; });
      }
    }

    const answer = ['Equivalent resistance: ' + withUnit(equivalent, 'Ω')];
    const chip = ['R_eq = ' + withUnit(equivalent, 'Ω')];
    if (battery) {
      answer.push('Current from the ' + decimal(battery) + ' V battery: ' + withUnit(totalCurrent, 'A'));
      chip.push('I = ' + withUnit(totalCurrent, 'A'));
      for (const x of r) {
        answer.push('Through ' + x.label + ' (' + decimal(x.value) + ' Ω): ' +
          withUnit(x.current, 'A') + ', p.d. ' + withUnit(x.voltage, 'V'));
        chip.push(x.label + ': I = ' + withUnitExactFirst(x.current, 'A'));
      }
    }
    return {
      type: 'circuit', verified: true, network: true, layout: layout,
      battery: battery, blocks: blocks, note: note,
      equivalent: equivalent, totalCurrent: totalCurrent,
      answer: answer, chip: chip, checkText: [],
      caption: 'Schematic drawn from the question\'s own resistances' +
        (battery ? ' and its ' + decimal(battery) + ' V supply' : '') +
        (note ? ' (' + note + ').' : '') +
        '. Calculations shown are done here from those values, not copied from the written answer; wire lengths are not to scale.'
    };
  }

  function resistorNetwork(text) {
    const t = normalise(text);
    if (!/Ω|\bohm/i.test(t)) return null;
    /* Other components change the circuit; this renderer would be fiction. */
    if (/(?:capacit\w*|induct\w*|diode\w*|transistor\w*|ammeter\w*|voltmeter\w*|galvanometer\w*|potentiometer\w*|zener\w*|\bled\b|internal resistance)/i.test(t)) return null;
    if (/bridge|network of|combination of three|three resistors in parallel|tetrahedron|cube/i.test(t)) return null;

    const found = resistorValues(t);
    if (found.length < 2 || found.length > 3) return null;
    if (found.some(r => !isFinite(r.value) || r.value <= 0)) return null;

    const volts = [];
    { const re = /(\d+(?:\.\d+)?)\s*(?:V|volts?)\b/gi; let m; while ((m = re.exec(t))) volts.push(Number(m[1])); }
    const uniqueVolts = [...new Set(volts)];
    if (uniqueVolts.length > 1) return null;
    const battery = uniqueVolts.length ? uniqueVolts[0] : null;
    if (battery != null && (!isFinite(battery) || battery <= 0)) return null;

    const hasParallel = /parallel/i.test(t), hasSeries = /series/i.test(t);
    const values = found.map(r => r.value);
    let layout = null, pairIdx = null;

    if (hasParallel && hasSeries) {
      if (values.length !== 3) return null;
      pairIdx = mixedPair(t, found);
      if (!pairIdx) return null;
      layout = 'mixed';
    } else if (hasParallel) {
      layout = 'parallel';
    } else if (hasSeries) {
      layout = 'series';
    } else {
      return null;
    }

    /* A current answer with no supply cannot be computed; the equivalent
       resistance alone is still worth drawing. */
    return computeNetwork(layout, values, pairIdx, battery);
  }

  /* ------------------------------------------------- mensuration solids

     One plain solid, drawn at its own r and h, with the volume and the
     surface areas computed here. Composite objects (a cone on a cylinder, a
     cavity, a melted-and-recast sphere) are refused: their surface area is
     not the sum of the parts, so a labelled stack would still be a guess. */

  function piFor(r, t) {
    /* "take π = 3.14" wins; otherwise 22/7 when the radius is a multiple of
       7 or 3.5 (the CBSE convention: a radius the sevens cancel), else 3.14. */
    const stated = t.match(/(?:π|pi)\s*(?:=|is|take)\s*(3\.14|22\s*\/\s*7)/i);
    if (stated) return stated[1].replace(/\s+/g, '') === '3.14' ? 3.14 : 22 / 7;
    return Math.abs(r / 3.5 - Math.round(r / 3.5)) < 1e-9 ? 22 / 7 : 3.14;
  }

  function lengthIn(t, words) {
    /* "[word] ... 7 cm" -- the unit is required, so a bare number in an
       option list cannot be mistaken for a measurement. */
    const re = new RegExp('(?:' + words + ')[^0-9.;]{0,24}(\\d+(?:\\.\\d+)?)\\s*(cm|centimetres?|centimeters?|m|metres?|meters?|सेमी|मीटर)', 'i');
    const m = t.match(re);
    if (!m) return null;
    return { value: Number(m[1]), unit: /^(m|metres?|meters?|मीटर)$/i.test(m[2]) ? 'm' : 'cm' };
  }

  function mensurationSolid(text) {
    const t = normalise(text);
    const cyl = /cylind|बेलन/i.test(t);
    const cone = /\bcone\b|conical|शंकु/i.test(t);
    /* "hemispherical" contains "spherical", and "अर्धगोला" contains "गोला";
       read the hemisphere first and let it claim the word. */
    const hemi = /hemispher|अर्ध\s*गोल/i.test(t);
    const sph = !hemi && /sphere|spherical|गोल[ाे]/i.test(t);
    const named = [cyl, cone, hemi, sph].filter(Boolean).length;
    if (!named) return null;
    if (named > 1) return null;                       /* composite: not drawn */
    if (/frustum|छिन्नक|cavit|hollowed|melted|melt\b|recast|remould|reshap|dropped|immersed|submerged|converted|vessel|overflow/i.test(t)) return null;
    if (/slant\s*height|तिर्यक\s*ऊँचाई/i.test(t)) return null;
    const kind = sph ? 'sphere' : hemi ? 'hemisphere' : cone ? 'cone' : 'cylinder';

    let unit = null, r = null;
    const R = lengthIn(t, 'radius|radii|त्रिज्या');
    if (R) { r = R.value; unit = R.unit; }
    if (r == null) {
      const d = lengthIn(t, 'diameter|व्यास');
      if (!d) return null;
      r = d.value / 2; unit = d.unit;
    }
    let h = null;
    if (kind === 'cylinder' || kind === 'cone') {
      const hh = lengthIn(t, 'height|ऊँचाई|tall');
      if (!hh) {
        const eq = t.match(/\bh\s*=\s*(\d+(?:\.\d+)?)\s*(cm|सेमी)/i);
        if (!eq) return null;
        h = Number(eq[1]);
      } else {
        if (unit && hh.unit !== unit) return null;    /* mixed units: refuse */
        h = hh.value; unit = hh.unit;
      }
      if (!(h > 0) || h / r > 40 || h / r < 0.05) return null;
    }
    if (!(r > 0) || r > 500) return null;
    const U1 = unit, U2 = unit + '²', U3 = unit + '³';
    const pi = piFor(r, t);
    const piText = Math.abs(pi - 22 / 7) < 1e-9 ? '22/7' : '3.14';
    const sq = (v) => v * v;
    let vol, csa, tsa, extra = [];
    if (kind === 'cylinder') {
      vol = pi * sq(r) * h; csa = 2 * pi * r * h; tsa = 2 * pi * r * (r + h);
    } else if (kind === 'cone') {
      const l = Math.sqrt(sq(r) + sq(h));
      vol = (pi * sq(r) * h) / 3; csa = pi * r * l; tsa = pi * r * (l + r);
      extra.push('l = √(r² + h²) = ' + decimal(l) + ' ' + U1);
    } else if (kind === 'sphere') {
      vol = (4 * pi * Math.pow(r, 3)) / 3; csa = 4 * pi * sq(r); tsa = csa;
    } else {
      vol = (2 * pi * Math.pow(r, 3)) / 3; csa = 2 * pi * sq(r); tsa = 3 * pi * sq(r);
    }
    const volume = 'V = ' + decimal(vol) + ' ' + U3;
    const curved = (kind === 'sphere' ? 'Surface area' : 'Curved surface area') + ' = ' + decimal(csa) + ' ' + U2;
    const total = (kind === 'sphere' ? '' : 'Total surface area = ' + decimal(tsa) + ' ' + U2);

    /* Put the quantity the question asks for first; the others follow. */
    const asked = /volume|घनफल|आयतन/i.test(t) ? 0
      : /total|whole|सम्पूर्ण|संपूर्ण|कुल/i.test(t) ? 2
      : /curved|lateral|surface\s*area|वक्र|पार्श्व|पृष्ठीय|सतह/i.test(t) ? 1 : 0;
    const all = [volume, curved].concat(total ? [total] : []).concat(extra.slice(0, 1));
    const ordered = [all[asked] || all[0]].concat(all.filter((_, i) => i !== asked));

    const dims = 'r = ' + decimal(r) + ' ' + U1 + (h != null ? ', h = ' + decimal(h) + ' ' + U1 : '');
    return {
      type: 'solid', verified: true, solid: kind,
      r: decimal(r) + ' ' + U1, h: h == null ? undefined : decimal(h) + ' ' + U1,
      formulas: ordered.slice(0, 3),
      answer: ordered,
      caption: 'Drawn from the measurements in the question (' + dims + '); volume and areas are calculated here with π = ' +
        piText + '. Not to scale.'
    };
  }

  /* ---------------------------------------------- two points on a plane */

  function coordinatePoints(text) {
    const t = normalise(text);
    /* The section formula, a ratio, three vertices, collinearity and
       "equidistant from" are all different questions with different
       answers; only the plain two-point distance/midpoint is drawn. */
    if (/equidistant|समदूरस्थ|section\s*formula|विभाजन\s*सूत्र|ratio|अनुपात|collinear|संरेख|area\s+of\s+the\s+triangle|त्रिभुज\s+का\s+क्षेत्रफल/i.test(t)) return null;
    if (!/distance|दूरी|mid-?point|मध्य\s*-?\s*बिंदु/i.test(t)) return null;
    const pts = [];
    const re = /\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/g;
    let m;
    while ((m = re.exec(t))) pts.push({ x: Number(m[1]), y: Number(m[2]) });
    if (pts.length !== 2) return null;
    const dx = pts[1].x - pts[0].x, dy = pts[1].y - pts[0].y;
    const d = Math.hypot(dx, dy);
    if (!(d > 0)) return null;
    const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
    const answer = [];
    if (/mid-?point|मध्य\s*-?\s*बिंदु/i.test(t)) {
      answer.push('midpoint = (' + decimal(mid.x) + ', ' + decimal(mid.y) + ')');
      answer.push('PQ = ' + decimal(d));
    } else {
      answer.push('PQ = ' + decimal(d));
      answer.push('midpoint = (' + decimal(mid.x) + ', ' + decimal(mid.y) + ')');
    }
    return {
      type: 'distance', verified: true,
      x1: pts[0].x, y1: pts[0].y, x2: pts[1].x, y2: pts[1].y,
      answer: answer,
      caption: 'Plotted from the two points named in the question; PQ and the midpoint are calculated here. ' +
        'Each grid square is one unit.'
    };
  }

  /* --------------------------------------------------- lens / mirror ray */

  function opticsRay(text) {
    const t = normalise(text);
    const lens = /lens|लेंस/i.test(t), mirror = /mirror|दर्पण/i.test(t);
    if (lens === mirror) return null;                  /* both or neither */
    if (/combination|two\s+lenses|two\s+mirrors|संयोजन|दो\s+लेंस|दो\s+दर्पण/i.test(t)) return null;
    const convex = /convex|converging|उत्तल|अभिसारी/i.test(t);
    const concave = /concave|diverging|अवतल|अपसारी/i.test(t);
    if (convex === concave) return null;               /* no stated kind */

    /* "focal length 15 cm" (English) and "15 सेमी फोकस दूरी" (Hindi) state the
       same thing in opposite word order, so the number closest to the words
       wins -- otherwise the loose "up to 25 characters" gap reads the object
       distance as the focal length. */
    const focalLength = (str) => {
      const phrase = str.match(/focal\s*length|फोकस\s*दूरी/i);
      const at = phrase ? phrase.index : -1;
      const cands = [];
      const patterns = [
        /(?:focal\s*length|फोकस\s*दूरी)[^0-9.;]{0,25}(\d+(?:\.\d+)?)/i,
        /(\d+(?:\.\d+)?)\s*(?:cm|सेमी)?\s*(?:की\s*)?(?:focal\s*length|फोकस\s*दूरी)/i,
        /\bf\s*=\s*(\d+(?:\.\d+)?)\s*(?:cm|सेमी)/i
      ];
      for (const re of patterns) {
        const m = str.match(re);
        if (!m) continue;
        cands.push({ v: Number(m[1]), dist: at >= 0 ? Math.abs(m.index + m[0].indexOf(m[1]) - at) : 0 });
      }
      cands.sort((a, b) => a.dist - b.dist);
      return cands.length ? cands[0].v : null;
    };
    const F = focalLength(t);
    if (F == null || !(F > 0) || F > 500) return null;

    /* Distances with the words around them, so "the image is formed at
       30 cm" can never be read as the object distance. Hindi puts the number
       before the noun ("15 सेमी फोकस दूरी"), English after it, so both sides
       of the number are inspected. */
    const dists = [];
    const re = /(\d+(?:\.\d+)?)\s*(?:cm|centimetres?|centimeters?|सेमी)/gi;
    const clauseOf = (at) => {
      let start = 0, end = t.length;
      for (const sep of ['.', '।', ';']) {
        const before = t.lastIndexOf(sep, at);
        if (before > start) start = before;
        const after = t.indexOf(sep, at);
        if (after >= 0 && after < end) end = after;
      }
      return t.slice(start, end);
    };
    let m;
    while ((m = re.exec(t))) {
      const start = m.index, end = re.lastIndex;
      const before = t.slice(Math.max(0, start - 50), start);
      const after = t.slice(end, end + 30);
      /* the focal length is the lens's, not the object's; an object's height
         is a length but not a distance along the axis */
      if (/^\s*(?:focal|फोकस|tall|ऊँचाई|लंबा|लम्बा)|^\s*(?:is\s+the\s+)?focal/i.test(after)) continue;
      dists.push({ v: Number(m[1]), start: start, before: before, after: after, clause: clauseOf(start) });
    }
    const hasObject = (str) => /object|वस्तु/i.test(str);
    const hasImage = (str) => /image|प्रतिबिम्ब|screen|स्क्रीन/i.test(str);
    const objectish = dists.filter(d => hasObject(d.before) && !hasImage(d.before));
    const byClause = dists.filter(d => hasObject(d.clause) && !hasImage(d.clause));
    const candidate = objectish.length === 1 ? objectish : (objectish.length === 0 && byClause.length === 1 ? byClause : []);
    if (candidate.length !== 1) return null;
    const d = candidate[0].v;
    if (!(d > 0) || d > 2000) return null;
    if (Math.abs(d - F) < 1e-9) return null;           /* image at infinity */
    /* "find where the object must be placed for the image at 40 cm" is the
       inverse question; the object distance is not one of the given values */
    if (/image\s+(?:is\s+)?(?:formed|obtained)|प्रतिबिम्ब\s+(?:बनता|प्राप्त)/i.test(t) &&
        !/find|ज्ञात|determine|calculate/i.test(t)) return null;

    let v, mm;
    if (lens) {
      const f = convex ? F : -F;
      v = (f * d) / (d - f);
      mm = -v / d;                                     /* m = v/u, u = -d */
    } else {
      const f = concave ? -F : F;
      v = (f * d) / (d + f);
      mm = v / d;                                      /* m = -v/u, u = -d */
    }
    if (!isFinite(v) || Math.abs(v) > 5000) return null;
    const real = lens ? v > 0 : v < 0;
    const inverted = mm < 0;
    const side = lens
      ? (real ? 'opposite side of the lens' : 'same side as the object')
      : (real ? 'in front of the mirror' : 'behind the mirror');

    const answer = [
      'v = ' + decimal(Math.abs(v)) + ' cm (' + (real ? 'real' : 'virtual') + ', ' + side + ')',
      'm = ' + (mm < 0 ? '−' : '') + decimal(Math.abs(mm)) + ' (' + (inverted ? 'inverted' : 'erect') + ', ' +
        (Math.abs(mm) > 1 ? 'enlarged' : Math.abs(mm) < 1 ? 'diminished' : 'same size') + ')'
    ];
    return {
      type: 'optics', verified: true, device: lens ? 'lens' : 'mirror',
      kind: convex ? 'convex' : 'concave', f: F, u: d, v: v, m: mm,
      real: real, inverted: inverted,
      /* |v| is what a written answer should repeat; used only for a note. */
      checkText: [decimal(Math.abs(v)), decimal(Math.abs(v)).replace('.', ',')].filter(Boolean),
      computed: { v: Math.abs(v), m: mm },
      answer: answer,
      caption: 'Distances are drawn to scale from the question (' + (lens ? 'lens' : 'mirror') + ', f = ' + decimal(F) +
        ' cm, object at ' + decimal(d) + ' cm); image distance and magnification are calculated here. Arrow heights show ' +
        'direction and relative size, not distance.'
    };
  }

  function forQuestion(question) {
    const text = normalise(question);
    if (!text || text.length > 900) return null;
    let spec = null;
    try { spec = heightsAndDistances(text); } catch (_) { spec = null; }
    if (!spec) { try { spec = resistorNetwork(text); } catch (_) { spec = null; } }
    if (!spec) { try { spec = mensurationSolid(text); } catch (_) { spec = null; } }
    if (!spec) { try { spec = coordinatePoints(text); } catch (_) { spec = null; } }
    if (!spec) { try { spec = opticsRay(text); } catch (_) { spec = null; } }
    return spec && spec.answer && spec.answer.length ? spec : null;
  }

  const api = {
    normalise: normalise, decimal: decimal, exact: exact, withUnit: withUnit,
    withUnitExactFirst: withUnitExactFirst,
    heightsAndDistances: heightsAndDistances, resistorNetwork: resistorNetwork,
    mensurationSolid: mensurationSolid, coordinatePoints: coordinatePoints, opticsRay: opticsRay,
    computeNetwork: computeNetwork, forQuestion: forQuestion
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.UP = root.UP || {};
  root.UP.workedFigure = api;
})(typeof window === 'undefined' ? globalThis : window);
