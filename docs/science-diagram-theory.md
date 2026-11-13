# Honest science schematics and theory explanation styles (26c8)

## Reported causes

The circuit renderer always drew one generic cell/resistor loop regardless of
the AI caption. It also called label() without appending its result, so component
labels vanished. An apparatus with no supported parts could draw a substitute
balance/bench/caption, unrelated to the requested experiment. Changing captions
could not fix these structural errors.

## Runtime changes

- Two-resistor parallel and series renderers now use real separate components,
  labelled R₁/R₂. Parallel resistors connect across the same two rails; series
  resistors share one current path. Supply and resistor symbols have gaps rather
  than a shorting wire through the symbol. No guessed resistance values.
- The original question determines topology/count and the numeric ohm values,
  including shared units and kΩ/MΩ. Provider values cannot override these.
  Without an unambiguous pair of values, R₁/R₂ remain symbolic with a caption
  explaining that fact. Unsupported/mixed/three-component networks are omitted.
- Copper electrolytic-refining questions can use a supported labelled schematic:
  impure Cu anode (+), pure Cu cathode (−), DC source, acidified CuSO₄,
  Cu²⁺ transfer, soluble impurities and anode mud. This is an explanatory runtime
  drawing, NOT a replacement for a source textbook figure. The template is gated
  by the original copper/electrolytic question, not a caption alone.
- Empty/unsupported apparatus data produces no graphical figure wrapper or fake
  balance. A valid concept flow may still appear independently. Malformed Maths
  geometry retains its existing short warning; no large blank figure is shown.
- No imported Chemistry/Biology/Business data, question wording or source crops
  were edited.

## Theory style

Policy explicitly forbids forced numerical examples for descriptive theory.
Three explanation styles must each cover the requested subparts and reach the
same conclusion, rather than splitting setup, reactions and impurities into
three incomplete methods. Requested electrode equations remain appropriate.
Theory answer UI says explanations / Different ways to understand / Show all
explanations, with next-explanation controls. The prompt instruction does not
constitute a guarantee of provider correctness or completeness.

## Checks

science_diagrams.js validates topology/count, original values vs invented 999,
shared/kΩ units, symbolic labels, unsupported omission and copper labels.
science_diagram_browser.js tests actual Ask rendering at 1280/390px, matching
rails/labelled components, copper cell plus separate flow, theory controls, and
no graphical wrapper for empty apparatus. Screenshot files are in /tmp, not Git.
AI responses are mocked; no real-provider or production correctness claim.
