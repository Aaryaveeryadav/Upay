const assert=require('node:assert/strict');
const f=require('../../assets/js/answer-format');
assert.equal(f.text(String.raw`K_{max} = h\nu - \Phi_0`),'Kₘₐₓ = hν - Φ₀');
assert.equal(f.text(String.raw`\nu < \nu_0 \implies \text{No emission}`),'ν < ν₀ ⇒ No emission');
assert.equal(f.text(String.raw`h\nu = h\nu_0 + \frac{1}{2}mv_{max}^2`),'hν = hν₀ + (1/2)mvₘₐₓ²');
assert.equal(f.text(String.raw`V_0 = \frac{h}{e}\nu - \frac{\Phi_0}{e}`),'V₀ = (h/e)ν - (Φ₀/e)');
assert.equal(f.text(String.raw`\frac{a+b}{c-d}`),'((a+b)/(c-d))');
assert.equal(f.text(String.raw`\sqrt{\frac{a}{b}}`),'√((a/b))');
assert.equal(f.text(String.raw`\frac{\Phi_{0}}{e}`),'(Φ₀/e)');
assert.equal(f.text('x^2-3x+2'),'x²-3x+2');
const raw={question:'Original K_max',diagram:{type:'flow',nodes:[String.raw`\Phi_0`]},approaches:[{steps:[{t:String.raw`\nu_0`,m:String.raw`x^2`}]}]};
const formatted=f.answer(raw);
assert.equal(formatted.question,raw.question);
assert.equal(formatted.diagram.nodes[0],'Φ₀');
assert.equal(formatted.approaches[0].steps[0].m,'x²');
assert.deepEqual(f.answer(formatted),formatted,'presentation must be idempotent');
assert.equal(raw.diagram.nodes[0],String.raw`\Phi_0`,'do not mutate stored/source records');
assert.equal(f.text('<img src=x onerror=alert(1)>'),'<img src=x onerror=alert(1)>','formatter returns text, callers still escape HTML');
console.log('PASS readable AI maths, grouped fractions, labels, nested commands, immutability/idempotence');

const pasted='Find all positive integers n for which n²+10n+2026 is a perfect square.';
assert.equal(f.question(String.raw`Find all positive integers \(n\) for which \(n^2+10n+2026\) is a perfect square.`),pasted);
assert.equal(f.question(String.raw`Find all positive integers \\(n\\) for which \\(n^2+10n+2026\\) is a perfect square.`),pasted);
assert.equal(f.question('Plain text n^2 should stay unchanged'),'Plain text n^2 should stay unchanged');
assert.equal(f.question(String.raw`Path C:\notes\chapter`),String.raw`Path C:\notes\chapter`);
assert.equal(f.question(f.question(pasted)),pasted);
console.log('PASS single/double-escaped pasted TeX, idempotence and unchanged plain text');

/* Unsupported Unicode sub/superscripts remain structured for the safe renderer. */
const vm=require('node:vm'),fs=require('node:fs');
const context={UP:{}};context.window=context;vm.createContext(context);
vm.runInContext(fs.readFileSync('assets/js/math-render.js','utf8'),context);
for(const [input,expected] of [[String.raw`Z_{AB}`, '<sub class="math-script">AB</sub>'], [String.raw`e^{-E_a/RT}`, '<sup class="math-script">−Eₐ/RT</sup>']]) {
  const result=f.text(input.replace('-', '−'));
  assert(context.UP.mathRender.math(result).includes(expected), `${result} should render as ${expected}`);
  assert.equal(f.text(result),result);
}
console.log('PASS grouped subscripts and exponents render safely and remain idempotent');

const m=context.UP.mathRender;
for(const input of [String.raw`\int_{0}^{\pi/2} f(x) dx`, '∫₀^(π/2) f(x) dx', '∫^{π/2}_{0} f(x) dx', '∫₀¹ x dx', '∫ₐ^b f(x) dx']) {
  const formatted=f.text(input), html=m.math(formatted);
  assert(html.includes('class="math-integral"') && html.includes('class="math-integral-lower"'), html);
  assert(html.includes('class="math-integral-upper"'), html);
  assert(!html.includes('^('), html);
}
const integralHtml=m.math(f.text(String.raw`\int_0^{\pi/2} f(x) dx`));
assert(integralHtml.includes('aria-label="integral from 0 to π/2"'));
assert.match(integralHtml, /math-integral-upper">π\/2<\/span>/);
assert.match(integralHtml, /math-integral-lower">0<\/span>/);
for (const input of ['dy/dx', 'd²y/dx²', '∂y/∂x']) {
  const html=m.rich(input);
  assert(html.includes('class="math-frac math-derivative"') && html.includes('aria-label="'+input+'"'), html);
}
const deriv = f.text(String.raw`\frac{dy}{dx} = 2x`);
assert.equal(deriv, 'dy/dx = 2x');
assert(m.math(deriv).includes('math-frac-num'));
assert.equal(f.text(deriv), deriv);
assert(m.math('e^(−Eₐ/RT)').includes('<sup class="math-script">−Eₐ/RT</sup>'));
assert(!m.math('https://example.com/d/dx').includes('math-derivative'));
assert(m.math('∫_{0}^{<img src=x>}').includes('&lt;img src=x&gt;'), 'math content is escaped');
assert.equal(f.question(String.raw`\int_0^1 x dx`),String.raw`\int₀¹ x dx`);
console.log('PASS stacked integral limits, parenthesized exponents, derivative fractions and safe escaping');

assert(m.math(f.text('∫_{a}^{b} f(x) dx')).includes('aria-label="integral from a to b"'));
assert.equal(f.text(String.raw`\frac{\partial y}{\partial x}`), '∂y/∂x');
