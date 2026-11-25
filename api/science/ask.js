/* Class 10 Science tutor, and the study chat for every subject.
 *
 * This path is kept because the legacy tutor screen and older bookmarks call
 * it: /api/science/ask?question=... It is answered by exactly the same handler
 * as /api/chat/ask, so there is one implementation and one model boundary.
 *
 * Why not a separate function: Vercel's Hobby plan allows 12 serverless
 * functions per deployment and this repository already has 12. Re-exporting
 * the handler keeps /api/science/ask working without spending a slot, and
 * guarantees the two paths can never drift apart again.
 *
 * The response keeps the legacy tutor contract (tutor_* error codes) because
 * assets/js/app.js and docs/science-tutor.md depend on it; the shared chat
 * handler returns those codes for this route.
 */
'use strict';

module.exports = require('../chat/ask.js');
