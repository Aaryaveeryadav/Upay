# Copied TeX and AI waiting feedback (26c6)

Copied questions can include TeX math delimiters, sometimes double escaped.
Student-question formatting now unwraps those delimiters and presents supported
maths in Unicode, e.g. n²+10n+2026. Paste replaces the selected text at the caret;
plain-text paste is left to the browser. Submit, Enter, shared/deep-link Ask
input and textarea display use the same formatter. Imported source banks are
not rewritten. Only recognized notation is transformed; unknown TeX remains
visible rather than guessed, and normal HTML escaping is preserved.

The AI client previously aborted after 25 seconds even though the serverless
endpoint allows 30 seconds for model generation and any necessary repair. It
now allows 35 seconds including transport time, so a 26–30 second valid answer
is not discarded and retried unnecessarily. This is not a claim that increasing
the timeout makes model inference faster. Progress feedback now explains that
three explanations/diagrams are being prepared, updates after six seconds and
is removed together with the loading dots when completed or failed. The old
slow-status selector did not match the current dots-only loader. Form submission
no longer forces an extra render immediately after changing the route.

The shared policy asks for concise, substantive 2–4-step approaches while
retaining all three approaches and useful diagrams. Provider latency, retries,
load and response repair remain external sources of delay. No real-provider
latency benchmark or production performance guarantee is implied.

Tests: question-format unit cases cover single/double escaping and preserving
plain text. pasted_question_browser.js tests selection replacement, submitted
payload/display, one request per submission, a mocked 26-second response with
browser virtual time, progress and spinner cleanup at 1280/390px. All external
AI requests are mocked. No account limits or provider settings were changed.
