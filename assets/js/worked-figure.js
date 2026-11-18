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

  function forQuestion(question) {
    const text = normalise(question);
    if (!text || text.length > 900) return null;
    let spec = null;
    try { spec = heightsAndDistances(text); } catch (_) { spec = null; }
    if (!spec) { try { spec = resistorNetwork(text); } catch (_) { spec = null; } }
    return spec && spec.answer && spec.answer.length ? spec : null;
  }

  const api = {
    normalise: normalise, decimal: decimal, exact: exact, withUnit: withUnit,
    withUnitExactFirst: withUnitExactFirst,
    heightsAndDistances: heightsAndDistances, resistorNetwork: resistorNetwork,
    computeNetwork: computeNetwork, forQuestion: forQuestion
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.UP = root.UP || {};
  root.UP.workedFigure = api;
})(typeof window === 'undefined' ? globalThis : window);
