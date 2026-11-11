# AI solution presentation policy

All sections using `/api/ai/solve` share `lib/solve-policy.js`, on both the local
server and serverless deployment.

- Request at least three developed approaches for every subject. Theory can use
  different explanation styles. When three independent calculations do not exist,
  label conceptual explanations and checks honestly, not as independent methods.
- Reject missing/empty approaches, duplicate names, and exact duplicate working.
  This structural check cannot prove semantic originality or factual correctness.
- Make at most one complete repair request for a short/duplicate draft. Serverless
  repair shares the original 30-second deadline. If still short, return 502 rather
  than fabricate or silently deliver a one-method AI answer. Existing offline
  fallback remains labelled as local, not an AI answer.
- Ask for a helpful diagram where applicable. All subjects support labelled
  concept flows; physical figure types remain restricted by subject. Provider
  output is data, never raw HTML/SVG. Flow labels/captions are escaped in the UI.
- Display all approaches and diagrams in Ask, inline question solutions, and
  practice-paper solutions. Older cached AI answers are not reused as new-policy
  solutions. No changes to source textbook figures or subject content.
- AI replies remain unverified unless an existing independent checker applies.
  Do not invent source passages, quotations, data, or official keys.

Tests use mocked providers, not live paid AI. They check the contract and UI, not
actual model accuracy or whether a model always chooses the ideal diagram.
One repair may consume an additional provider call; the student solve still
consumes one usage-guard attempt. No production configuration is changed here.
