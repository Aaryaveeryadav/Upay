/* =====================================================================
   Upay · paste repair

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

  /* Returns { text, changed }. */
  function tidy(raw, options) {
    const opts = options || {};
    const original = String(raw == null ? '' : raw);
    let text = original.replace(/\r\n?/g, '\n');
    let changed = false;

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

  const api = { tidy: tidy, isTokenSoup: isTokenSoup, joinFragments: joinFragments, restorePowers: restorePowers };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.UP = root.UP || {}; root.UP.pasteRepair = api; }
})(typeof window === 'undefined' ? globalThis : window);
