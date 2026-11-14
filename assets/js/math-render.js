/* Safe, dependency-free rendering for the small TeX subset used in question
   text and answers. Unknown commands are displayed without their backslash so
   students never see raw command syntax such as `\\vec{B}_{net}`. */
(function (root) {
  'use strict';

  function escapeHTML(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }

  const SYMBOLS = {
    alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ϵ', zeta: 'ζ',
    eta: 'η', theta: 'θ', vartheta: 'ϑ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ',
    nu: 'ν', xi: 'ξ', pi: 'π', varpi: 'ϖ', rho: 'ρ', varrho: 'ϱ', sigma: 'σ', varsigma: 'ς',
    tau: 'τ', upsilon: 'υ', phi: 'φ', varphi: 'ϕ', chi: 'χ', psi: 'ψ', omega: 'ω',
    Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ',
    Upsilon: 'Υ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
    times: '×', cdot: '·', ast: '∗', div: '÷', pm: '±', mp: '∓',
    le: '≤', leq: '≤', ge: '≥', geq: '≥', neq: '≠', ne: '≠', equiv: '≡', approx: '≈',
    sim: '∼', propto: '∝', infty: '∞', partial: '∂', nabla: '∇', degree: '°', circ: '∘',
    angle: '∠', parallel: '∥', perp: '⊥', therefore: '∴', because: '∵',
   rightarrow: '→', to: '→', leftarrow: '←', Rightarrow: '⇒', Leftarrow: '⇐',
    Leftrightarrow: '⇔', iff: '⇔', mapsto: '↦', dots: '…', ldots: '…', cdots: '⋯',
    sum: '∑', prod: '∏', int: '∫', oint: '∮', partial: '∂',
    land: '∧', lor: '∨', neg: '¬', in: '∈', notin: '∉', subset: '⊂', subseteq: '⊆',
    supset: '⊃', supseteq: '⊇', cup: '∪', cap: '∩', emptyset: '∅',
    ell: 'ℓ', hbar: 'ℏ', Re: 'ℜ', Im: 'ℑ',
    quad: '　',qquad: '　　', enspace: ' ', thinspace: ' ',
    ',': ' ', ';': ' ', ':': ' ', '!': '', ' ': ' ',
    '%': '%', '$': '$', '#': '#', '&': '&amp;', '_': '_', '{': '{', '}': '}',
    '\\': '<br>'
  };

  const COMMAND_CLASSES = {
    vec: 'math-vector', overrightarrow: 'math-vector', overleftarrow: 'math-left-vector',
    overline: 'math-overline', bar: 'math-overline', widehat: 'math-hat', hat: 'math-hat',
    tilde: 'math-tilde', underline: 'math-underline'
  };
  const TEXT_COMMANDS = new Set(['text', 'textrm', 'mathrm', 'operatorname']);
  const SUPPORTED_FUNCTIONS = new Set([
    'sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'cosec', 'log', 'ln', 'exp', 'lim',
    'max', 'min', 'det', 'Pr', 'gcd', 'lcm'
  ]);

  function balancedGroup(source, start, open, close) {
    if (source[start] !== open) return null;
    let depth = 1;
    for (let i = start + 1; i < source.length; i++) {
      const ch = source[i];
      if (ch === '\\' && (source[i + 1] === open || source[i + 1] === close)) {
        i++;
        continue;
      }
      if (ch === open) depth++;
      else if (ch === close && --depth === 0) {
        return { value: source.slice(start + 1, i), end: i + 1 };
      }
    }
    return null;
  }

  function commandEnd(source, start) {
    if (source[start] !== '\\' || start + 1 >= source.length) return start + 1;
    if (/[A-Za-z]/.test(source[start + 1])) {
      let i = start + 2;
      while (i < source.length && /[A-Za-z]/.test(source[i])) i++;
      return i;
    }
    return start + 2;
  }

  function readArgument(source, start) {
    let i = start;
    while (i < source.length && /\s/.test(source[i])) i++;
    if (i >= source.length) return null;
    const group = balancedGroup(source, i, '{', '}');
    if (group) return { value: group.value, end: group.end };
    if (source[i] === '\\') {
      const end = commandEnd(source, i);
      return { value: source.slice(i, end), end: end };
    }
    const cp = source.codePointAt(i);
    const char = String.fromCodePoint(cp);
    return { value: char, end: i + char.length };
  }

  function stripMathDelimiters(value) {
    return String(value == null ? '' : value).replace(/\$\$([\s\S]*?)\$\$|\$([^$\r\n]+?)\$/g, function (whole, display, inline) {
      const body = display === undefined ? inline : display;
      // Do not eat currency markers such as "$5 + $10". Only remove paired
      // dollar delimiters when their contents actually look like mathematics.
      return /\\[A-Za-z]+|[_^{}=<>±×÷√]/.test(body) ? body : whole;
    });
  }

  function renderTeX(input) {
    const source = stripMathDelimiters(input);

    function renderRange(text) {
      let out = '';
      for (let i = 0; i < text.length;) {
        const ch = text[i];

        if (ch === '\\') {
          if (i + 1 >= text.length) { out += '\\'; i++; continue; }
          const end = commandEnd(text, i);
          const rawCommand = text.slice(i + 1, end);
          const next = text[end];
          const isWord = /^[A-Za-z]+$/.test(rawCommand);
          const command = isWord ? rawCommand : rawCommand;

          // TeX math delimiters and sizing commands have no visible content.
          if (['(', ')', '[', ']', 'left', 'right', 'displaystyle', 'textstyle', 'scriptstyle', 'limits', 'nolimits'].includes(command)) {
            i = end; continue;
          }
          if (command === 'begin' || command === 'end') {
            const env = balancedGroup(text, end, '{', '}');
            i = env ? env.end : end; continue;
          }
          if (command === 'hline' || command === 'quad' || command === 'qquad' || command === 'enspace' || command === 'thinspace') {
            out += SYMBOLS[command] || '';
            i = end; continue;
          }

          if (command === 'frac' || command === 'dfrac' || command === 'tfrac' || command === 'binom') {
            const first = readArgument(text, end);
            const second = first && readArgument(text, first.end);
            if (first && second) {
              const numerator = renderRange(first.value);
              const denominator = renderRange(second.value);
              out += command === 'binom'
                ? '<span class="math-binomial"><span>' + numerator + '</span><span>' + denominator + '</span></span>'
                : '<span class="math-frac"><span class="math-frac-num">' + numerator + '</span><span class="math-frac-den">' + denominator + '</span></span>';
              i = second.end; continue;
            }
          }

          if (command === 'sqrt') {
            let argStart = end, indexHTML = '';
            if (text[argStart] === '[') {
              const rootIndex = balancedGroup(text, argStart, '[', ']');
              if (rootIndex) { indexHTML = '<span class="math-root-index">' + renderRange(rootIndex.value) + '</span>'; argStart = rootIndex.end; }
            }
            const arg = readArgument(text, argStart);
            if (arg) {
              out += indexHTML + '√<span class="math-root-content">' + renderRange(arg.value) + '</span>';
              i = arg.end; continue;
            }
          }

          if (COMMAND_CLASSES[command]) {
            const arg = readArgument(text, end);
            if (arg) {
              out += '<span class="' + COMMAND_CLASSES[command] + '">' + renderRange(arg.value) + '</span>';
              i = arg.end; continue;
            }
          }

          if (TEXT_COMMANDS.has(command)) {
            const arg = readArgument(text, end);
            if (arg) {
              const cls = command === 'operatorname' ? 'math-operator' : 'math-text';
              out += '<span class="' + cls + '">' + renderRange(arg.value) + '</span>';
              i = arg.end; continue;
            }
          }

          if (command === 'mathbf' || command === 'boldsymbol') {
            const arg = readArgument(text, end);
            if (arg) {
              out += '<strong class="math-bold">' + renderRange(arg.value) + '</strong>';
              i = arg.end; continue;
            }
          }
          if (command === 'mathit') {
            const arg = readArgument(text, end);
            if (arg) {
              out += '<i class="math-italic">' + renderRange(arg.value) + '</i>';
              i = arg.end; continue;
            }
          }
          if (command === 'mathbb') {
            const arg = readArgument(text, end);
            if (arg) {
              const doubleStruck = { R: 'ℝ', C: 'ℂ', Z: 'ℤ', N: 'ℕ', Q: 'ℚ' };
              out += doubleStruck[arg.value] || '<span class="math-double-struck">' + renderRange(arg.value) + '</span>';
              i = arg.end; continue;
            }
          }

          if (Object.prototype.hasOwnProperty.call(SYMBOLS, command)) {
            out += SYMBOLS[command];
            i = end; continue;
          }
          if (SUPPORTED_FUNCTIONS.has(command)) {
            out += '<span class="math-operator">' + escapeHTML(command) + '</span>';
            i = end; continue;
          }
          if (command === '\\') {
            out += '<br>';
            i = end; continue;
          }
          // An unsupported TeX name is plain text rather than a raw slash
          // command. This fallback is safe and still preserves its letters.
          out += escapeHTML(command);
          i = end;
          continue;
        }

        if (ch === '_' || ch === '^') {
          const arg = readArgument(text, i + 1);
          if (arg) {
            const tag = ch === '_' ? 'sub' : 'sup';
            out += '<' + tag + ' class="math-script">' + renderRange(arg.value) + '</' + tag + '>';
            i = arg.end; continue;
          }
        }

        if (ch === '~') { out += '&nbsp;'; i++; continue; }
        out += escapeHTML(ch);
        i++;
      }
      return out;
    }

    return renderRange(source);
  }

  function splitBoldMarkers(value, render) {
    const source = String(value == null ? '' : value);
    let output = '', cursor = 0;
    const marker = /«([^»]*)»/g;
    let match;
    while ((match = marker.exec(source))) {
      output += render(source.slice(cursor, match.index));
      output += '<b>' + render(match[1]) + '</b>';
      cursor = match.index + match[0].length;
    }
    output += render(source.slice(cursor));
    return output;
  }

  function math(value) {
    return splitBoldMarkers(value, renderTeX);
  }

  function rich(value) {
    return splitBoldMarkers(value, function (part) {
      return renderTeX(part).replace(/\r\n?|\n/g, '<br>');
    });
  }

  const api = { escapeHTML: escapeHTML, renderTeX: renderTeX, math: math, rich: rich };
  root.UP = root.UP || {};
  root.UP.mathRender = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
