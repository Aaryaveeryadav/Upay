/* =====================================================================
   Upaay · paste repair

   A question copied out of a PDF, a slide or a rendered web page rarely
   arrives as a sentence. It arrives as a column of fragments — one glyph or
   one word per line, superscript charges split off, a "°" on its own line —
   and the student is left to retype it.

   `tidy()` rebuilds that column into the sentence it came from. It only
   rewrites what the paste itself shows:

     · fragments are joined back into words and lines ("Z" + "n" → "Zn"),
     · a sign after an ion is put back as a charge ("Zn" + "2" + "-" → "Zn²⁻"),
     · punctuation and brackets lose the spaces the fragments left behind,
     · a lost superscript in an algebra-looking paste is restored ("x3" → "x³"),
       because "x3" is not a number in a polynomial — the digit is the power.

   Signs and values are preserved. Power formatting is inferred only for a
   limited algebra pattern; students are asked to check the result.
   ===================================================================== */
(function (root) {
  'use strict';

  const SIGNS = { '+': '⁺', '-': '⁻', '−': '⁻' };
  const SUPDIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const superscript = (value) => Array.from(String(value)).map((ch) =>
    SIGNS[ch] || (/[0-9]/.test(ch) ? SUPDIGITS[Number(ch)] : ch)).join('');

  /* A soup has many lines and almost all of them are a couple of characters. */
  function isTokenSoup(lines) {
    const filled = lines.filter((line) => line.trim());
    if (filled.length < 6) return false;
    const short = filled.filter((line) => line.trim().length <= 4).length;
    return short / filled.length >= 0.6;
  }

  const CLOSING = /^[)\]}.,;:।!?]+$/;
  const OPENS = /[(\[{|]$/;
  const BARE_SIGN = /^[+\-−]$/;

  /* Join the fragments with the spacing the original sentence had. */
  function joinFragments(fragments) {
    let out = '';
    for (let i = 0; i < fragments.length; i++) {
      const token = fragments[i];
      const next = fragments[i + 1] || '';
      if (!token) continue;
      if (!out) { out = token; continue; }
      const last = out.slice(-1);

      /* "2" then "-" is the charge on the ion just named ("Zn²⁺"). */
      if (/^[0-9]+$/.test(token) && BARE_SIGN.test(next) && /(?:^|[\s|])(?:[A-Z][a-z]?|[A-Z][a-z]?[₀-₉]+)$/.test(out)) {
        out += superscript(token + next);
        i += 1;
        continue;
      }
      /* A separated power follows a mathematical variable, never a bare
         number; leave the following subtraction sign on the baseline. */
      if (/^[2-9]$/.test(token) && /(?:^|[^A-Za-z])[xyzt]$/.test(out) &&
          /^(?:[+\-−=]|$)/.test(next)) { out += superscript(token); continue; }
      if (/^[xyzt]$/.test(token) && /(?:^|[+\-−=])\s*\d+$/.test(out)) { out += token; continue; }
      /* a lone degree marker belongs to the letter before it ("E°cell") */
      if (/^[°∘]$/.test(token) && /[A-Za-z]$/.test(last)) { out += '°'; continue; }
      /* "Z" + "n" is one element symbol: the capital starts a word, the
         lower-case fragment finishes it. A word fragment is never glued to
         the word before it. */
      if (/^[A-Z]$/.test(token) && /^[a-z]{1,2}$/.test(next)) {
        out += (out ? ' ' : '') + token;
        continue;
      }
      if (/^[a-z]{1,2}$/.test(token) && /[A-Z]$/.test(last)) { out += token; continue; }
      if (/^[|∣]+$/.test(token)) { out += ' ' + (token.length > 1 ? '||' : '|') + ' '; continue; }
      if (CLOSING.test(token)) { out += token; continue; }
      if (OPENS.test(last)) { out += token; continue; }
      out += ' ' + token;
    }
    return out;
  }

  /* Spacing left behind by the fragments. */
  function respace(text) {
    return String(text)
      .replace(/\u00a0/g, ' ')
      .replace(/\s+([,.;:!?)\]])/g, '$1')
      .replace(/([(\[])\s+/g, '$1')
      .replace(/\s*\|\s*/g, ' | ')
      .replace(/\|\s*\|/g, '||')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\s+([।])/g, '$1')
      .replace(/\.([A-Z])/g, '. $1')
      .trim();
  }

  /* A lost superscript in algebra: "x3 − 3x2" is x³ − 3x², never 3·x and 2·x.
     Only single x/y/z/t powers, only next to an operator or the end of the
     text, and never in chemistry, where the digit after a letter is a count
     ("H2O", "CO2") — those letters are capitals and are left alone anyway. */
  function restorePowers(text) {
    if (/mol\b|molar|electrode|potential|cell\s*\(|अणु|विलयन/i.test(text)) return text;
    if (!/(?:^|\s)[fgyhp]\s*\(|=/.test(text)) return text;
    /* The letter may follow a coefficient ("−3x2" is −3x²) but never another
       letter, so "set2" or "CO2" are untouched. */
    return text.replace(/(?<![A-Za-z])([xyzt])([2-9])\b(?=\s*(?:[-+=−)/]|$))/g,
      (all, letter, digit) => letter + superscript(digit));
  }

  /* PDF selection may put a definite integral's limits on separate lines,
     even when the rest of the question is normal prose. Only combine a
     complete, unambiguous two-limit block followed by an integrand. Keep the
     order as supplied and retain the actual values. */
  function repairCalculus(text) {
    const bound = '[+−-]?(?:[0-9]+(?:\\.[0-9]+)?|π|∞|[a-zA-Z])(?:\\s*\\/\\s*(?:[0-9]+|π|[a-zA-Z]))?';
    const integral = new RegExp('(∫|\\\\int)\\s*\\n[ \\t]*(' + bound + ')[ \\t]*\\n[ \\t]*(' + bound + ')[ \\t]*\\n[ \\t\\n]*(?=[^\\s])', 'g');
    return text.replace(integral, (all, symbol, lower, upper) =>
      symbol + '_{' + lower.trim() + '}^{' + upper.trim() + '} ')
      .replace(/(?<![A-Za-z0-9_])(d(?:[²³]|\^[23])?[a-z]?|∂[a-z]?)\s*\n\s*\/\s*\n\s*(d[a-z](?:[²³]|\^[23])?|∂[a-z])(?![A-Za-z0-9_])/g, '$1/$2');
  }

  /* Rendered web maths can copy both its accessibility and visual text:
     a variable on one line, followed by the same variable at the start of
     the next. Require multiple duplicates before changing the layout. */
  function repairDuplicatedInlineMath(text) {
    const raw = text.split('\n');
    const lines = raw.map(line => {
      const t = line.trim();
      const bold = t.match(/^\*\*([A-Za-zΑ-Ωα-ω]|[0-9]+)\*\*$/);
      return bold ? bold[1].trim() : t;
    });
    const remove = new Set();
    const nextFilled = i => { let j=i+1; while(j<lines.length && !lines[j]) j++; return j; };
    for (let i=0;i<lines.length;i++) {
      const a=lines[i], j=nextFilled(i), b=lines[j] || '';
      if (/^[A-Za-zΑ-Ωα-ω]$/.test(a) &&
          new RegExp('^' + a + '(?=$|[\\s.,;:!?])').test(b)) { remove.add(i); continue; }
      // PDF copies "2", "d", "2d"; remove the two duplicated fragments.
      if (/^\d+$/.test(a) && /^[A-Za-zΑ-Ωα-ω]$/.test(b)) {
        const k=nextFilled(j), c=lines[k] || '';
        if (new RegExp('^' + a + b + '(?=$|[\\s.,;:!?])').test(c)) { remove.add(i); remove.add(j); }
      }
    }
    if (remove.size < 2 || /\[\s*\[|[=≤≥<>+−×÷∫√|^_]|(?:^|\s)-(?:\s|$)/.test(text)) return text;
    const kept=lines.filter((line,i)=>line && !remove.has(i));
    // Do not collapse aligned equations or multi-line matrix/number rows.
    if (kept.some(line=>/[=≤≥]/.test(line)) || kept.some(line=>/^(?:[-+]?\d+\s+){2,}[-+]?\d+$/.test(line))) return text;
    return respace(kept.join(' '));
  }

  /* Plain-text copies of rendered maths may contain each coordinate and
     equation twice. Only collapse exact copies when at least two independent
     mathematical duplicates are present; do not rewrite ordinary repetition. */
  function repairDuplicatePlainMath(text) {
    let count = 0;
    let out = text.replace(/\b([A-Z])\s*\(\s*([+−-]?\d+)\s*,\s*([+−-]?\d+)\s*\)\s*\1\s*\(\s*([+−-]?\d+)\s*,\s*([+−-]?\d+)\s*\)/g,
      (all, name, x, y, x2, y2) => {
        if (x.replace('−','-') !== x2.replace('−','-') || y.replace('−','-') !== y2.replace('−','-')) return all;
        count++; return name+'('+x+','+y+')';
      });
    out = out.replace(/\b([a-z])\s*=\s*([a-z])\s*([+−-])\s*(\d+)\s*\1\s*=\s*\2\s*([+−-])\s*(\d+)/gi,
      (all,a,b,op,n,op2,n2) => {
        if (op.replace('−','-') !== op2.replace('−','-') || n !== n2) return all;
        count++; return a+' = '+b+' '+op+' '+n;
      });
    if (count < 2) return text;
    return out.replace(/\b([A-Z])\s+\1(?=\s+(?:divides|lies)\b)/g, '$1')
      .replace(/\b([a-z])\s*:\s*(\d+)\s+\1\s*:\s*\2\b/g, '$1:$2');
  }

  /* Web math renderers often put both MathML and visual spans on the
     clipboard. Read just the semantic MathML, never both copies. If any
     notation is unsupported, leave the plain clipboard untouched. */
  function fromHTML(html, parser) {
    if (!html || !parser) return null;
    try {
      const doc = parser.parseFromString(html, 'text/html');
      doc.querySelectorAll('script,style,template').forEach(n => n.remove());
      const maths = Array.from(doc.querySelectorAll('math'));
      if (!maths.length) return null;
      function math(node) {
        if (node.nodeType === 3) return node.nodeValue;
        if (node.nodeType !== 1) return '';
        const tag = node.localName.toLowerCase();
        const children = Array.from(node.childNodes).filter(n => n.nodeType === 1 || (n.nodeType === 3 && n.nodeValue.trim()));
        if (tag === 'annotation' || tag === 'annotation-xml') return '';
        if (tag === 'semantics') { const first = children.find(n => n.nodeType === 1 && !/^annotation/.test(n.localName)); return first ? math(first) : null; }
        const parts = children.map(math); if (parts.some(p => p === null)) return null;
        if (tag === 'mfrac' && parts.length === 2) return '('+parts[0]+')/('+parts[1]+')';
        if (tag === 'msup' && parts.length === 2) return '('+parts[0]+')^('+parts[1]+')';
        if (tag === 'msub' && parts.length === 2) return parts[0]+'_('+parts[1]+')';
        if (tag === 'msqrt') return '√('+parts.join('')+')';
        if (['math','mrow','mi','mn','mo','mtext','mstyle','mpadded'].includes(tag)) return parts.join('');
        return null;
      }
      for (const m of maths) {
        const value = math(m); if (value === null || !value.trim()) return null;
        // KaTeX/MathJax wraps accessibility and visual representations together.
        const wrapper = m.closest('.katex, mjx-container, .MathJax');
        const target = wrapper || m;
        target.replaceWith(doc.createTextNode(value));
      }
      doc.querySelectorAll('br').forEach(n => n.replaceWith(doc.createTextNode('\n')));
      doc.querySelectorAll('p,div,li').forEach(n => n.appendChild(doc.createTextNode('\n')));
      return (doc.body.textContent || '').replace(/\u00a0/g,' ').replace(/[ \t]*\n[ \t]*/g,'\n').trim() || null;
    } catch (_) { return null; }
  }

  /* Returns { text, changed }. */
  function tidy(raw, options) {
    const opts = options || {};
    const original = String(raw == null ? '' : raw);
    let text = original.replace(/\r\n?/g, '\n');
    let changed = false;

    // A rendered variable followed by its Markdown duplicate, e.g. P*P*.
    // Only collapse an exact adjacent copy; never infer missing fractions.
    const inline = text.replace(/\b([A-Za-z])\s*\*\1\*/g, '$1');
    if (inline !== text) { text = inline; changed = true; }
    const repeated = repairDuplicatePlainMath(text);
    if (repeated !== text) { text = repeated; changed = true; }
    const duplicated = repairDuplicatedInlineMath(text);
    if (duplicated !== text) { text = duplicated; changed = true; }

    const calculus = repairCalculus(text);
    if (calculus !== text) { text = calculus; changed = true; }

    const lines = text.split('\n');
    if (isTokenSoup(lines)) {
      const joined = respace(joinFragments(lines.map((line) => line.trim()).filter(Boolean)));
      if (joined) { text = joined; changed = true; }
    }


    if (opts.powers !== false) {
      const powered = restorePowers(text);
      if (powered !== text) { text = powered; changed = true; }
    }

    if (!changed) text = original;
    return { text: text, changed: changed && text !== original };
  }

  const api = { fromHTML: fromHTML, repairDuplicatePlainMath: repairDuplicatePlainMath, tidy: tidy, isTokenSoup: isTokenSoup, joinFragments: joinFragments, restorePowers: restorePowers, repairCalculus: repairCalculus, repairDuplicatedInlineMath: repairDuplicatedInlineMath };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.UP = root.UP || {}; root.UP.pasteRepair = api; }
})(typeof window === 'undefined' ? globalThis : window);
