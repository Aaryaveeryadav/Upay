'use strict';
/* Who is asking, what may they see, and what does the site show them.
 *
 * The role, school and class of a person are read from the database after the
 * Supabase access token is verified. Nothing here trusts a request body, a
 * query string or user metadata for identity. Teacher and owner permissions
 * are additionally checked per action, not just per session.
 *
 * When tenancy is not configured (UPAY_DATABASE_URL missing) the site keeps
 * its previous behaviour: public study pages, local admin login. Every account
 * endpoint answers 503 tenant_unavailable instead of pretending.
 */
const db = require('./db.js');
const { authenticate } = require('./supabase-auth.js');

const ROLES = new Set(['owner', 'teacher', 'student']);
const SUBJECT_RE = /^[a-z0-9-]{2,30}$/;

function unavailable() {
  const e = new Error('Accounts are not set up on this server yet.');
  e.status = 503; e.code = 'tenant_unavailable';
  return e;
}
function bad(message, code) {
  const e = new Error(message || 'That request is not allowed.');
  e.status = 400; e.code = code || 'bad_request';
  return e;
}
function forbidden(message, code) {
  const e = new Error(message || 'You do not have access to this.');
  e.status = 403; e.code = code || 'forbidden';
  return e;
}
function notFound(message) {
  const e = new Error(message || 'Not found.');
  e.status = 404; e.code = 'not_found';
  return e;
}

/* Resolve the caller from the bearer token. Returns null for a guest. */
async function resolve(req) {
  if (!db.enabled()) throw unavailable();
  const auth = await authenticate(req);
  if (auth.unavailable) { const e = new Error('Sign-in verification is temporarily unavailable.'); e.status = 503; e.code = 'sign_in_unavailable'; throw e; }
  if (!auth.user) return null;
  const profile = await db.one(
    `select p.id, p.role, p.school_id, p.full_name, p.phone, p.class_level, p.board, p.lang,
            p.status, p.must_change, p.id_last4, p.created_at,
            s.name as school_name, s.code as school_code, s.status as school_status
       from profiles p left join schools s on s.id = p.school_id
      where p.id = $1`, [auth.user.id]);
  if (!profile) {
    // A verified account with no profile has not finished signup.
    const e = new Error('Finish your signup to continue.');
    e.status = 428; e.code = 'profile_missing';
    e.user = { id: auth.user.id, email: auth.user.email };
    throw e;
  }
  profile.email = auth.user.email;
  profile.active = profile.status === 'active' && (!profile.school_id || profile.school_status === 'active');
  return profile;
}

/* The caller must be signed in, active, and hold one of the roles. */
function requireRole(profile, ...roles) {
  if (!profile) { const e = new Error('Sign in to continue.'); e.status = 401; e.code = 'sign_in_required'; throw e; }
  if (!profile.active) {
    const e = new Error(profile.school_status === 'suspended'
      ? 'Your school\u2019s access is paused. Ask your school administrator.'
      : 'This account is not active. Ask your school administrator.');
    e.status = 403; e.code = 'account_inactive';
    throw e;
  }
  if (roles.length && !roles.includes(profile.role)) throw forbidden();
  return profile;
}

/* Owner-only. Kept separate so a bug in role comparison cannot grant it. */
function requireOwner(profile) {
  requireRole(profile);
  if (profile.role !== 'owner') throw forbidden('Only the master administrator can do that.', 'owner_only');
  return profile;
}

/* The scope a person is allowed to browse. A student's class/board comes from
   their profile; a teacher picks a (class, subject) they actually teach. */
async function scopeFor(profile, requested) {
  const want = requested || {};
  if (profile.role === 'student') {
    return { class: profile.class_level || 10, subject: String(want.subject || 'science'), board: profile.board || 'cbse' };
  }
  if (profile.role === 'teacher') {
    const rows = await db.all('select distinct class_level, subject from teaching where teacher_id = $1 order by class_level, subject', [profile.id]);
    if (!rows.length) return null;
    const match = rows.find(r => String(r.class_level) === String(want.class) && r.subject === want.subject) || rows[0];
    return { class: match.class_level, subject: match.subject, board: profile.board || 'cbse', classes: rows };
  }
  return { class: Number(want.class) || 10, subject: String(want.subject || 'science'), board: String(want.board || 'cbse'), classes: [] };
}

function cleanClass(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 8 || n > 12) throw bad('Choose a class between 8 and 12.', 'bad_class');
  return n;
}
function cleanSubject(value) {
  const s = String(value || '').trim().toLowerCase();
  if (!SUBJECT_RE.test(s)) throw bad('Choose a subject.', 'bad_subject');
  return s;
}
function cleanName(value) {
  const s = String(value || '').replace(/\s+/g, ' ').trim();
  if (s.length < 2 || s.length > 120) throw bad('Enter your full name.', 'bad_name');
  return s;
}
function cleanPhone(value) {
  const s = String(value || '').replace(/\s+/g, ' ').trim();
  if (s && !/^[0-9+() -]{6,20}$/.test(s)) throw bad('Enter a valid phone number or leave it empty.', 'bad_phone');
  return s;
}

/* Public shape of a person. Never includes the identity hash or email hash. */
function publicPerson(p) {
  if (!p) return null;
  return {
    id: p.id, role: p.role, name: p.full_name, phone: p.phone,
    email: p.email || '', schoolId: p.school_id, school: p.school_name || '', schoolCode: p.school_code || '',
    schoolStatus: p.school_status || null, class: p.class_level, board: p.board, lang: p.lang,
    status: p.status, active: p.active !== false, mustChange: !!p.must_change, idLast4: p.id_last4 || ''
  };
}

/* The one capability document the app boots from. */
async function capabilities(profile) {
  const out = {
    role: profile.role,
    person: publicPerson(profile),
    scope: await scopeFor(profile),
    owner: profile.role === 'owner',
    can: {
      managePlatform: profile.role === 'owner',
      manageSchool: profile.role === 'owner',
      manageContent: profile.role === 'owner',
      managePeople: profile.role === 'teacher',
      recordStudy: profile.role === 'student'
    },
    subjects: await db.all('select class_level as class, subject, title, title_hi from subjects order by class_level, subject').catch(() => [])
  };
  if (profile.role === 'owner') {
    out.schools = await db.all('select id, name, code, board, city, status, plan, paid_until from schools order by name').catch(() => []);
  }
  if (profile.role === 'teacher') {
    out.teaching = await db.all('select class_level as class, subject from teaching where teacher_id = $1', [profile.id]).catch(() => []);
  }
  return out;
}

module.exports = {
  ROLES, resolve, requireRole, requireOwner, scopeFor, capabilities, publicPerson,
  cleanClass, cleanSubject, cleanName, cleanPhone,
  unavailable, bad, forbidden, notFound
};
