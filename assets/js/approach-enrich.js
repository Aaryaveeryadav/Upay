/* =====================================================================
   Upay · Three-Approach Enricher
   Attaches three solution methods to EVERY question that does not already
   have approaches populated, for EVERY class and subject (10, 11, 12)
   including MCQ/SA/LA/Assertion/Case questions.

   Runs AFTER all PYQ loaders. Methods are deterministic "starter" skeletons
   tailored by topic keywords so the student never sees an empty "Solve" pane.
   Long-form answers still call the AI for line-by-line math (the existing
   askAI pipeline); the pre-seeded approaches give the method names and
   first steps instantly, and when AI finishes it replaces/extends them.

   Diagram extraction runs separately (c12_figures.py) and attaches inline
   image data URIs to q.figs.
   ===================================================================== */
(function () {
  var UP = window.UP = window.UP || {};
  if (!UP.pyq) return;

  /* -------- topic detection -------- */
  var TOPICS = [
    {re: /matrix|matrices|\[aij\]|transpose|elementary (row|column)/i, name: "Matrix computation",
     hint: "Apply the matrix definition / operation directly and simplify."},
    {re: /determinant|adj\s*a|\ba\s*[\u207b\u207b]?\s*1\b|cofactor|cramer|adjoint|minor/i, name: "Determinant / inverse",
     hint: "Expand the determinant or use A⁻¹ = adj(A)/|A|; apply Cramer's rule for systems."},
    {re: /principal value|sin\s*[\u2212-]?\s*1|cos\s*[\u2212-]?\s*1|tan\s*[\u2212-]?\s*1|sec\s*[\u2212-]?\s*1|cosec\s*[\u2212-]?\s*1|cot\s*[\u2212-]?\s*1|sin\u22121|tan\u22121|cos\u22121|inverse trig/i, name: "Inverse trig — principal branch",
     hint: "Restrict to the principal branch of the inverse-trig function and evaluate."},
    {re: /integral|\u222b|\\int|\bdx\b|antiderivative|consumer surplus|producer surplus|area under/i, name: "Integration",
     hint: "Use standard forms / substitution / parts; evaluate between limits for a definite integral."},
    {re: /differential equation|\bdy\s*\/\s*dx\b|order and degree|general solution|particular solution|variable separable|homogeneous|newton.*cool/i, name: "Differential equation",
     hint: "Identify the type (separable/linear/homogeneous) and solve with the standard recipe."},
    {re: /differentiate|\bderivative\b|d\s*y\s*\/\s*d\s*x|chain rule|marginal/i, name: "Differentiation",
     hint: "Apply chain/product/quotient rule; evaluate at the point."},
    {re: /probability|\bp\s*\(|bayes|binomial|poisson|normal|conditional|random variable|variance|expected value|distribution/i, name: "Probability",
     hint: "Apply total probability / Bayes / the named distribution directly."},
    {re: /vector|\bi\u0302?\b|\bj\u0302?\b|\bk\u0302?\b|dot product|cross product|projection|magnitude|unit vector|\u2192/i, name: "Vector algebra",
     hint: "Compute dot/cross products or apply vector identities directly."},
    {re: /cartesian equation|distance between|foot of (the )?perpendicular|coplanar|skew|direction cosine|direction ratio|3\s*D|line in space|plane/i, name: "3D geometry",
     hint: "Use the line/plane distance or direction-cosine formula directly."},
    {re: /linear programming|lpp|maximize|minimize|corner point|feasible|objective function|constraint/i, name: "Linear programming — corner point",
     hint: "Evaluate Z at each corner of the feasible region and pick the max/min."},
    {re: /relation|one-one|onto|equivalence|reflexive|symmetric|transitive|bijective|binary operation/i, name: "Definition check",
     hint: "Test the definition (reflexive/symmetric/transitive; one-one/onto) directly."},
    {re: /area bounded|area of.*region|bounded by.*curve|parabola/i, name: "Area as definite integral",
     hint: "Set up the definite integral between the intersection points and evaluate."},
    {re: /continu|differentiab|greatest integer|lhl|rhl|f\s*\(0\)|\blimit\b/i, name: "Continuity / differentiability",
     hint: "Apply LHL = RHL = f(a) for continuity; LHD = RHD for differentiability."},
    {re: /collinear|points.*collinear/i, name: "Collinearity (area=0)",
     hint: "Three points are collinear iff the triangle area is 0; solve for the unknown."},
    {re: /rate of change|sphere.*volume|surface area.*radius|marginal/i, name: "Related rates",
     hint: "Differentiate with respect to t, then plug in the given rate."},
    {re: /local maxima|local minima|maxim|minim|maximum|minimum|increasing|decreasing/i, name: "First/second derivative test",
     hint: "Set f\u2032(x)=0; classify with sign change or second derivative."},
    {re: /tangent|normal|slope.*curve/i, name: "Tangent / normal slope",
     hint: "Slope of tangent = dy/dx; slope of normal = -dx/dy."},
    {re: /modulo|congruence|lcm|hcf|binary number|remainder/i, name: "Modular arithmetic",
     hint: "Apply modular arithmetic properties and the division algorithm."},
    {re: /alloy|mixture|upstream|downstream|speed.*distance|average|boat|race|time and work/i, name: "Linear-equation application",
     hint: "Set up equations in two variables and solve."},
    {re: /index number|laspeyres|paasche|fisher|cpi|wpi|inflation|base year|current year/i, name: "Index-number formula",
     hint: "Apply the Laspeyres/Paasche/Fisher formula from the formula sheet."},
    {re: /time series|moving average|trend|seasonal|forecast/i, name: "Time-series analysis",
     hint: "Compute moving averages or fit least-squares trend and project."},
    {re: /annuity|emi|present value|future value|sinking fund|compound interest|return on investment|bond|share|dividend|effective rate/i, name: "Financial math",
     hint: "Use the annuity/CI/PV/FV formula or amortization schedule."},
    {re: /t-test|z-test|chi-square|hypothesis|null hypothesis|p-value|confidence interval|significance|standard error|t-distribution/i, name: "Hypothesis test",
     hint: "State H\u2080/H\u2081; compute the test statistic; compare with critical value."},
    {re: /hcf|lcm|prime factor|irrational|euclid/i, name: "Number theory", hint: "Apply Euclid's algorithm, prime factorisation, or the irrationality proof template."},
    {re: /polynomial|zeroes|coefficient|alpha|beta|sum.*zeroes|product.*zeroes/i, name: "Polynomial zeroes", hint: "Use the sum = -b/a, product = c/a relationships."},
    {re: /linear equation|pair of linear|elimination|substitution method|consistent|inconsistent/i, name: "Linear system", hint: "Use elimination/substitution or the a1/a2, b1/b2, c1/c2 consistency test."},
    {re: /quadratic equation|roots|discriminant|d\s*=|nature of roots|equal roots|real roots/i, name: "Quadratic formula", hint: "Use x = [-b ± √(b²-4ac)]/(2a); check discriminant for nature of roots."},
    {re: /ap\b|arithmetic progression|common difference|nth term|sum of first n terms|s_n/i, name: "AP formulas", hint: "Use a_n = a+(n-1)d, S_n = n/2[2a+(n-1)d]."},
    {re: /similar triangles|thales|bpt|aa similarity|sss similarity|sas similarity|basic proportionality/i, name: "Similar triangles", hint: "Apply BPT or AA/SSS/SAS similarity; sides are proportional."},
    {re: /pythagoras|right triangle|distance formula|coordinate distance|section formula|mid-point|trisection/i, name: "Coordinate geometry", hint: "Use distance/section/mid-point formula; Pythagoras for right triangles."},
    {re: /circle|tangent|secant|chord|sector|segment|arc length|radius.*circle|area of circle|tangents from|alternate segment/i, name: "Circle theorems", hint: "Apply tangent-radius perpendicularity, tangent-length equality, or area-of-sector formula."},
    {re: /trigonometric|sin|cos|tan|cosec|sec|cot|height.*distance|angle of elevation|angle of depression/i, name: "Trigonometry", hint: "Use trig ratios, sin²+cos²=1, or the sine/cosine rule as appropriate."},
    {re: /surface area|volume|cuboid|cube|cylinder|cone|sphere|hemisphere|frustum|combination of solids/i, name: "Mensuration", hint: "Break composite solids into known shapes; add/subtract volumes/SA as needed."},
    {re: /statistics|mean|median|mode|ogive|cumulative frequency|histogram|frequency distribution/i, name: "Statistics", hint: "Use the shortcut formula for mean / median class / modal class."},
    /* ----- Physics topic detectors ----- */
    {re: /coulomb|electrostatic force|charges.*apart|force between.*(charge|sphere)|permittivity|ε₀|epsilon/i, name: "Coulomb's law",
     hint: "Apply F = k·q₁q₂/r²; use superposition when there are multiple charges."},
    {re: /electric field|e\s*=\s*k|field due to|field at a point|dipole.*(field|moment)|electric flux|gauss/i, name: "Electric field / Gauss's law",
     hint: "Use E = kQ/r² for point charges; integrate for continuous distributions; apply Gauss's law for symmetric surfaces."},
    {re: /electric potential|potential due|equipotential|potential energy.*charge|capacitance|capacitor|combination of capacitors|dielectric|energy stored/i, name: "Electrostatic potential / capacitance",
     hint: "Use V = kQ/r; ½CV² for stored energy; 1/C series = Σ1/C, C parallel = ΣC."},
    {re: /ohm'?s law|resistivity|resistance|resistor|drift velocity|current density|kirchhoff|wheatstone|meter bridge|potentiometer/i, name: "Current electricity",
     hint: "Apply V=IR, series/parallel resistance rules, Kirchhoff's KCL/KVL; use ρ=RA/l for resistivity."},
    {re: /magnetic field|biot-savart|ampere|moving charge|cyclotron|torque.*loop|galvanometer|solenoid|lorentz/i, name: "Magnetic effects of current",
     hint: "Apply F=qv×B (Lorentz), F=I(L×B); Biot-Savart dB=μ₀Idl×r̂/(4πr²); Ampere's law for symmetry."},
    {re: /magnetism|magnetic dipole|bar magnet|earth.*magnet|hysteresis|ferromagnetic|diamagnetic|paramagnetic/i, name: "Magnetism and matter",
     hint: "Use B on axis/equator of a dipole; classify material by χ; recall earth's magnetic elements."},
    {re: /electromagnetic induction|faraday|lenz|motional emf|self (inductance|induction)|mutual inductance|eddy current|induced.*emf|flux.*change/i, name: "Electromagnetic induction",
     hint: "Apply Faraday ε = -dΦ/dt, Lenz's law; ε=Blv for motional emf; L = Φ/I for inductance."},
    {re: /alternating current|ac circuit|rms|reactance|impedance|lc(r)? oscillation|resonance|power factor|transformer|generator/i, name: "AC circuits",
     hint: "Use phasor method; Z = √(R²+(XL-XC)²); XL=ωL, XC=1/(ωC); resonant ω=1/√(LC)."},
    {re: /electromagnetic waves|displacement current|maxwell|em wave|electromagnetic spectrum|speed of em/i, name: "EM waves",
     hint: "c = 1/√(μ₀ε₀); recall the EM spectrum order and uses; apply Maxwell's equations conceptually."},
    {re: /(ray optics|reflection|refraction|lens|mirror|prism|total internal|critical angle|magnification|optical instrument|microscope|telescope|refractive index|\bf\s*=|lens maker|snell)/i, name: "Ray optics",
     hint: "Use mirror 1/f=1/v+1/u and lens 1/f=1/v-1/u formulas; apply sign convention consistently."},
    {re: /wave optics|interference|young'?s|diffraction|polarisation|brewster|huygens|fringe|slit|coherent|resolving power/i, name: "Wave optics",
     hint: "Fringe width β=λD/d; path difference = nλ for bright; apply Brewster tan i_p = n."},
    {re: /photoelectric|work function|einstein.*photo|de broglie|wave.*particle|dual nature|stopping potential|threshold frequency|photon|hv/i, name: "Dual nature / photoelectric effect",
     hint: "Apply Einstein's K_max = hν - φ; de Broglie λ = h/p = h/√(2mK) or h/(mv)."},
    {re: /bohr|rutherford|hydrogen atom|spectral series|rydberg|energy level|orbital|rydberg constant/i, name: "Atoms / Bohr model",
     hint: "Apply Bohr postulates; E_n = -13.6/n² eV; 1/λ = R(1/n₁² - 1/n₂²)."},
    {re: /nucleus|nuclear|radioactiv|half-?life|decay|binding energy|mass defect|fission|fusion|neutron|becquerel|mean life/i, name: "Nuclei / radioactivity",
     hint: "N = N₀e^(-λt), T½ = ln2/λ; BE = Δm·c²; conservation in fission/fusion."},
    {re: /semiconductor|diode|transistor|p-?n junction|intrinsic|extrinsic|doping|rectifier|gate|logic gate|truth table|zener|pnp|npn/i, name: "Semiconductor electronics",
     hint: "Recall diode forward/reverse bias, transistor current relations Ie=Ib+Ic, truth tables for logic gates."},
    /* ----- Chemistry topic detectors ----- */
    {re: /molarity|molality|mole fraction|solubility|henry.s|raoult.s|vapour pressure|osmotic pressure|boiling point|freezing point|colligative|van.t hoff/i, name: "Solutions / colligative",
     hint: "Apply Raoult/Henry/colligative-property formula; convert concentration units."},
    {re: /electrochemistry|nernst|kohlrausch|conductivity|molar conductivity|galvanic|cell potential|faraday|electrolysis|salt bridge/i, name: "Electrochemistry",
     hint: "Apply Nernst equation E=E°-(RT/nF)lnQ; ΔG=-nFE; Faraday's laws."},
    {re: /chemical kinetics|rate law|order of reaction|rate constant|half.?life|arrhenius|activation energy|integrated rate/i, name: "Chemical kinetics",
     hint: "Identify order; apply integrated rate law; k=A·exp(-Ea/RT); t½=ln2/k (1st order)."},
    {re: /d-block|f-block|transition metal|lanthanoid|actinoid|oxidation state.*transition|lanthanide contraction/i, name: "d & f block",
     hint: "Write d-electron config; find oxidation states; note half-filled stability."},
    {re: /coordination|ligand|iupac.*complex|crystal field|octahedral|tetrahedral|edta/i, name: "Coordination chemistry",
     hint: "Find oxidation state, coordination number, ligand denticity; apply VBT/CFT."},
    {re: /haloalkane|haloarene|nucleophilic substitution|sn1|sn2|grignard|wurtz|sandmeyer|chirality/i, name: "Haloalkanes/Haloarenes",
     hint: "Classify SN1/SN2/E1/E2; track stereochemistry at chiral centres."},
    {re: /alcohol|phenol|ether|dehydration|esterification|williamson|reimer-tiemann|kolbe|lucas/i, name: "Alcohols/Phenols/Ethers",
     hint: "Compare acidity; predict dehydration products (Saytzeff); Williamson for ether synthesis."},
    {re: /aldehyde|ketone|carboxylic acid|aldol|cannizzaro|grignard|rosenmund|fehling|tollen/i, name: "Aldehydes/Ketones/Acids",
     hint: "Identify reaction type (oxidation/reduction/condensation); recall Cannizzaro/Aldol/Grignard conditions."},
    {re: /amine|diazot|hoffmann bromamide|gabriel|carbylamine|benzenediazonium|basicity.*amine/i, name: "Amines",
     hint: "Rank basicity (aliphatic vs aromatic); apply diazotization/Hoffmann/Gabriel."},
    {re: /carbohydrate|protein|amino acid|peptide|glucose|sucrose|starch|cellulose|dna|rna|zwitterion|biomo/i, name: "Biomolecules",
     hint: "Classify; recall glycosidic/peptide/phosphodiester linkages."},
  ];

  function detectTopic(en) {
    if (!en) return {name: "Direct reasoning", hint: "Apply the relevant definition or formula directly."};
    for (var i=0;i<TOPICS.length;i++) if (TOPICS[i].re.test(en)) return {name: TOPICS[i].name, hint: TOPICS[i].hint};
    return {name: "Direct reasoning", hint: "Apply the definition / formula directly and simplify."};
  }

  function steps(text) {
    var lines = [];
    for (var i=1;i<arguments.length;i++) lines.push({t: arguments[i]});
    return lines;
  }

  function buildMCQ(q) {
    var topic = detectTopic(q.en);
    return [
      { name: "Option testing (verification)", tag: "Fastest for MCQ",
        steps: [
          {t: "Read the question and identify the condition the correct answer must satisfy."},
          {t: "Substitute each option back into the condition one by one."},
          {t: "Reject options that produce a contradiction; the one that survives is the answer."},
          {t: "Cross-verify with a quick unit/sign/domain check."},
        ],
        why: "For one-mark MCQs, testing options is often faster than full algebra and guarantees a result in under 30 seconds." },
      { name: topic.name, tag: "Textbook method",
        steps: [
          {t: topic.hint},
          {t: "Write down the relevant formula / definition."},
          {t: "Substitute the given values step by step."},
          {t: "Simplify and match the result against options (A)\u2013(D)."},
        ],
        why: "This is the paper-pen route examiners expect; it also exposes where a slip could occur." },
      { name: "Elimination with a special case", tag: "Smart hack",
        steps: [
          {t: "Check units/sign the answer must have \u2014 rule out options that disagree."},
          {t: "Try an extreme value or a simple special case (x=0, \u03b8=0/\u03c0/4, n=1) to narrow choices."},
          {t: "For graphs, identify domain/range/asymptotes and match the shape."},
          {t: "Pick the survivor and confirm with a one-line calculation."},
        ],
        why: "Two rounds of elimination often collapse four options to one without heavy algebra." }
    ];
  }

  function buildAssertion() {
    return [
      { name: "Truth-table approach", tag: "Systematic",
        steps: [
          {t: "Read Assertion (A) alone \u2014 decide True/False by proof or counter-example."},
          {t: "Read Reason (R) alone \u2014 decide True/False independently."},
          {t: "If both are True, check whether R is the correct explanation of A."},
          {t: "Match against the four standard options (A/B/C/D)."}]},
      { name: "Counter-example hunt", tag: "When you suspect false",
        steps: [
          {t: "Try a concrete counter-example for A."},
          {t: "Try one for R."},
          {t: "If either fails, the choice collapses to B/C/D immediately."},
          {t: "Only if both hold do you need the 'correct explanation' test."}]},
      { name: "Standard-result recall", tag: "Fast",
        steps: [
          {t: "If A is a named theorem/result, recall its hypothesis."},
          {t: "Check R against the actual reasoning (not a vague restatement)."},
          {t: "Pick the option matching the theorem exactly."}]}
    ];
  }

  function buildSA(q) {
    var topic = detectTopic(q.en);
    return [
      { name: "Direct formula / definition", tag: "Method I",
        steps: [
          {t: "Write 'Given' and 'To Find'."},
          {t: "Apply " + topic.name.toLowerCase() + " directly \u2014 show each substitution."},
          {t: "Simplify and box the answer with units."}]},
      { name: "Alternative route", tag: "Method II",
        steps: [
          {t: "Rewrite with a trig identity / substitution / coordinate change."},
          {t: "Solve the transformed problem \u2014 it should simplify."},
          {t: "Transform back and verify both routes agree."}]},
      { name: "Self-check", tag: "Verification",
        steps: [
          {t: "Plug the answer back into the original equation."},
          {t: "Check units, sign, and domain (denominators \u2260 0, log args > 0)."},
          {t: "Tap 'Solve with AI' for a full line-by-line walkthrough."}]}
    ];
  }

  function buildLA() {
    return [
      { name: "Standard procedure", tag: "Full mark route",
        steps: [
          {t: "Write Given, To Prove/Find; draw a labelled diagram if relevant."},
          {t: "State the formula/theorem you will use."},
          {t: "Work step-by-step with reasons; keep equations numbered."},
          {t: "End with the result boxed and a concluding sentence."}]},
      { name: "Alternative proof / coordinate method", tag: "Cross-verification",
        steps: [
          {t: "Re-attack using a different technique (coordinate geometry, vectors, induction, contradiction, substitution)."},
          {t: "You should land on the same answer; if not, one method has a mistake."}]},
      { name: "Edge-case sanity check", tag: "Guardrail",
        steps: [
          {t: "Test your result on a simple degenerate case (a=b=c, \u03b8=0, x=0)."},
          {t: "Check units/sign/dimensional consistency."},
          {t: "Tap 'Solve with AI' for a full three-method explanation with diagrams."}]}
    ];
  }

  function attach(q) {
    if (!q) return;
    // These are generic maths/science templates, not Accountancy solutions.
    // Imported Accountancy questions have no official answers or verified
    // methods; never manufacture a trigonometry/vector approach for them.
    if (+q.cls === 12 && (q.subject === 'accountancy' || q.subject === 'computerized-accounting')) return;
    if (q.approaches && q.approaches.length >= 3) return;
    var en = (q.en || "").toLowerCase();
    var isMCQ = q.opts && Object.keys(q.opts).length >= 4 && en.indexOf("assertion") < 0;
    var isAR = (q.q === 19 || q.q === 20) || /assertion\s*\(/i.test(q.en || "");
    var sec = (q.section || "").toUpperCase();
    if (isAR) q.approaches = buildAssertion();
    else if (isMCQ) q.approaches = buildMCQ(q);
    else if (sec === "D" || sec === "E" || (q.marks && q.marks >= 4)) q.approaches = buildLA();
    else q.approaches = buildSA(q);
  }

  // Enrich every question currently in UP.pyq (Class 10 + Class 12 + Applied)
  (UP.pyq || []).forEach(attach);

  // Hook into any future pyq-push that comes from lazy-loaded files so they
  // are also enriched on arrival.
  var _push = Array.prototype.push;
  UP.pyq.push = function () {
    for (var i=0;i<arguments.length;i++) if (arguments[i] && typeof arguments[i] === "object") attach(arguments[i]);
    return _push.apply(this, arguments);
  };
})();
