// The one place React talks to the server.
//
// The session token is a Supabase access token issued by /api/platform/login;
// it is kept in localStorage by the app shell. Nothing here decides a role: the
// server answers with the role it resolved from the person's profile.
const TOKEN_KEY = 'upay.session.token';
const PERSON_KEY = 'upay.session.person';

export function token() {
  try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (_) { return ''; }
}
export function savedPerson() {
  try { return JSON.parse(localStorage.getItem(PERSON_KEY) || 'null'); } catch (_) { return null; }
}
export function saveSession(result) {
  try {
    if (result && result.token) localStorage.setItem(TOKEN_KEY, result.token);
    if (result && result.person) localStorage.setItem(PERSON_KEY, JSON.stringify(result.person));
  } catch (_) {}
}
export function clearSession() {
  try { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(PERSON_KEY); } catch (_) {}
}

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message || 'Request failed');
    this.status = status; this.code = code;
  }
}

async function call(path, options = {}) {
  const headers = Object.assign({ 'content-type': 'application/json' }, options.headers || {});
  const bearer = token();
  if (bearer) headers.authorization = 'Bearer ' + bearer;
  let response;
  try {
    response = await fetch(path, { ...options, headers });
  } catch (_) {
    throw new ApiError(0, 'offline', 'The server is not reachable. Check your connection.');
  }
  let body = null;
  const text = await response.text();
  try { body = text ? JSON.parse(text) : {}; } catch (_) { body = {}; }
  if (!response.ok) {
    if (response.status === 401) clearSession();
    throw new ApiError(response.status, body.code || 'error', body.error || 'Request failed');
  }
  return body;
}

export const api = {
  me: () => call('/api/platform/me'),
  login: (email, password) => call('/api/platform/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  signup: (payload) => call('/api/platform/signup', { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => call('/api/platform/logout', { method: 'POST' }).catch(() => null),

  schools: () => call('/api/platform/schools'),
  createSchool: (payload) => call('/api/platform/schools', { method: 'POST', body: JSON.stringify(payload) }),
  updateSchool: (id, payload) => call('/api/platform/schools/' + id, { method: 'PATCH', body: JSON.stringify(payload) }),
  schoolSummary: (id) => call('/api/platform/owner/school/' + id),

  roster: () => call('/api/platform/roster'),
  addStudent: (email) => call('/api/platform/roster/student', { method: 'POST', body: JSON.stringify({ email }) }),
  addMark: (payload) => call('/api/platform/roster/mark', { method: 'POST', body: JSON.stringify(payload) }),
  recordScore: (payload) => call('/api/platform/roster/score', { method: 'POST', body: JSON.stringify(payload) }),
  addTeaching: (payload) => call('/api/platform/teaching', { method: 'POST', body: JSON.stringify(payload) }),

  content: (cls, subject, chapter) => call('/api/platform/content?' + new URLSearchParams({ class: cls, subject, ...(chapter ? { chapter } : {}) })),
  setContent: (payload) => call('/api/platform/content', { method: 'POST', body: JSON.stringify(payload) }),
  importContent: () => call('/api/platform/content/import', { method: 'POST', body: '{}' }),

  records: (params = {}) => call('/api/platform/records?' + new URLSearchParams(params)),
  addRecord: (payload) => call('/api/platform/records', { method: 'POST', body: JSON.stringify(payload) }),

  chatStatus: () => call('/api/chat/ask'),
  askChat: (payload) => call('/api/chat/ask', { method: 'POST', body: JSON.stringify(payload) })
};
