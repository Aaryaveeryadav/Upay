'use strict';
/* The multi-tenant platform API, shared by server.js and the Vercel handlers.
 *
 * Every action resolves the caller on the server (verified Supabase token ->
 * profiles row), then checks the action against the caller's role, school and
 * (class, subject) scope. A request body can never name a role, a school or
 * another person's record.
 *
 *   GET  /api/platform/me                 the capability document the app boots from
 *   POST /api/platform/signup             student or teacher signup (+ optional school code)
 *   POST /api/platform/login              email + password -> session token
 *   POST /api/platform/logout             (client keeps no server session; no-op)
 *   GET  /api/platform/schools            owner: every school
 *   POST /api/platform/schools            owner: create a school
 *   PATCH /api/platform/schools/:id       owner: suspend/resume, rename, plan
 *   GET  /api/platform/roster             teacher: classes, students, ranking, marks
 *   POST /api/platform/roster/student     teacher: attach a signed-up student
 *   POST /api/platform/roster/mark        teacher: priority/removed/formula on a topic
 *   POST /api/platform/roster/score       teacher: record a student's answer
 *   GET  /api/platform/content            school scope: topics and visibility
 *   POST /api/platform/content            owner: publish/unpublish a topic; teacher: school override
 *   GET  /api/platform/records            student: own study events; teacher: class; owner: school
 *   POST /api/platform/records            student: log one study event
 *   GET  /api/platform/owner/school/:id   owner: one school's counts and activity
 */
const db = require('./db.js');
const T = require('./tenancy.js');
const roster = require('./roster.js');
const admin = require('./supabase-admin.js');
const content = require('./content-control.js');

const MAX_BODY = 32 * 1024;

class HttpError extends Error {
  constructor(status, code, message, extra) {
    super(message || 'Request failed');
    this.status = status; this.code = code;
    if (extra) Object.assign(this, extra);
  }
}

function method(req) { return String(req.method || 'GET').toUpperCase(); }

async function readJson(req, limit) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    if (Buffer.byteLength(req.body, 'utf8') > (limit || MAX_BODY)) throw new HttpError(413, 'body_too_large', 'Request is too large.');
    try { return JSON.parse(req.body || '{}'); } catch (_) { throw new HttpError(400, 'bad_json', 'Send JSON.'); }
  }
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > (limit || MAX_BODY)) { reject(new HttpError(413, 'body_too_large', 'Request is too large.')); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch (_) { reject(new HttpError(400, 'bad_json', 'Send JSON.')); }
    });
    req.on('error', reject);
  });
}

function send(res, status, payload, headers) {
  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', 'authorization,content-type');
  res.setHeader('access-control-allow-methods', 'GET,POST,PATCH,OPTIONS');
  if (headers) for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(body);
}

function bearer(req) {
  const match = /^Bearer\s+(\S+)\s*$/i.exec(String((req.headers && req.headers.authorization) || ''));
  return match ? match[1] : '';
}

/* ------------------------------------------------------------- signup ---- */
async function signup(body) {
  const role = String(body.role || '').toLowerCase();
  if (!['student', 'teacher'].includes(role)) {
    throw new HttpError(400, 'bad_role', 'Choose whether you are a student or a teacher.');
  }
  const email = String(body.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200) throw new HttpError(400, 'bad_email', 'Enter a valid email address.');
  const password = String(body.password || '');
  if (password.length < 8 || password.length > 128 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new HttpError(400, 'weak_password', 'Use at least 8 characters with a letter and a number.');
  }
  const fullName = T.cleanName(body.name);
  const phone = T.cleanPhone(body.phone);
  const classLevel = T.cleanClass(body.class || 10);
  const board = ['cbse', 'icse', 'state', 'other'].includes(String(body.board || '').toLowerCase())
    ? String(body.board).toLowerCase() : 'cbse';
  const idNumber = String(body.idNumber || '').replace(/\s+/g, '');
  if (idNumber && !/^[0-9]{6,20}$/.test(idNumber)) throw new HttpError(400, 'bad_id', 'Enter only the digits of the ID number, or leave it empty.');
  // School: a school code invites the person into that school. A first user of
  // a school that does not exist yet becomes its initial teacher (the master
  // admin can always move them).
  let school = null;
  const code = String(body.schoolCode || '').trim().toLowerCase();
  const schoolName = String(body.school || '').trim();
  if (code) {
    school = await db.one('select id, name, code, status from schools where code = $1', [code]);
    if (!school) throw new HttpError(400, 'unknown_school', 'That school code was not found. Ask your school for the correct code.');
    if (school.status !== 'active') throw new HttpError(403, 'school_suspended', 'That school\u2019s access is paused.');
  } else if (schoolName) {
    if (schoolName.length < 2 || schoolName.length > 160) throw new HttpError(400, 'bad_school', 'Enter your school name.');
    const slug = schoolName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'school';
    const codeGuess = slug.slice(0, 24) + '-' + Math.random().toString(36).slice(2, 6);
    school = await db.one(
      `insert into schools (name, code, board, status)
       values ($1, $2, $3, 'active')
       on conflict (code) do nothing returning id, name, code, status`,
      [schoolName, codeGuess, board]);
    if (!school) school = await db.one('select id, name, code, status from schools where name = $1 limit 1', [schoolName]);
  }

  const created = await admin.createUser({ email, password });
  try {
    const profile = await db.one(
      `insert into profiles (id, role, school_id, full_name, email_join, phone, id_hash, id_last4, class_level, board, status, must_change)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active',false)
       on conflict (id) do nothing
       returning id, role, school_id, full_name, phone, class_level, board, status`,
      [created.id, role, school ? school.id : null, fullName, email, phone, db.idHash(idNumber), db.idLast4(idNumber), classLevel, board]);
    if (!profile) {
      // The auth user exists from a previous attempt without a profile.
      await db.query(
        `insert into profiles (id, role, school_id, full_name, email_join, phone, id_hash, id_last4, class_level, board)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         on conflict (id) do update set full_name = excluded.full_name, role = excluded.role, school_id = excluded.school_id`,
        [created.id, role, school ? school.id : null, fullName, email, phone, db.idHash(idNumber), db.idLast4(idNumber), classLevel, board]);
    }
    // A teacher starts with no teaching pairs; the roster screen asks for them.
    if (role === 'teacher' && school) {
      await db.query(
        `insert into teaching (teacher_id, school_id, class_level, subject)
         values ($1,$2,$3,$4) on conflict do nothing`,
        [created.id, school.id, classLevel, 'science']).catch(() => {});
    }
    const session = await admin.signIn({ email, password });
    return {
      ok: true,
      token: session.token,
      refresh: session.refresh,
      role,
      schoolCode: school ? school.code : '',
      note: role === 'student'
        ? 'Your account is ready. Ask your teacher to add you to a class to appear in the class ranking.'
        : 'Your account is ready. Choose the class and subject you teach in the teaching screen.'
    };
  } catch (e) {
    await admin.deleteUser(created.id);
    throw e;
  }
}

/* -------------------------------------------------------------- login ---- */
async function login(body) {
  const email = String(body.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new HttpError(400, 'bad_email', 'Enter your email address.');
  const password = String(body.password || '');
  if (!password) throw new HttpError(400, 'bad_password', 'Enter your password.');
  // The master administrator is a person with role 'owner' in the same table;
  // there is no separate login page and no special header.
  let session;
  try { session = await admin.signIn({ email, password }); }
  catch (e) {
    if (e.code === 'bad_credentials') throw new HttpError(401, 'bad_credentials', 'Email or password is not correct.');
    throw e;
  }
  const profile = await db.one(
    `select p.id, p.role, p.school_id, p.full_name, p.class_level, p.board, p.status,
            s.name as school_name, s.code as school_code, s.status as school_status
       from profiles p left join schools s on s.id = p.school_id where p.id = $1`, [session.user && session.user.id || '']);
  if (!profile) {
    throw new HttpError(428, 'profile_missing', 'This account has no profile yet. Complete the signup form.', { token: session.token, userId: session.user && session.user.id });
  }
  if (profile.status !== 'active') throw new HttpError(403, 'account_inactive', 'This account is not active. Ask your school administrator.');
  if (profile.school_id && profile.school_status !== 'active') throw new HttpError(403, 'school_suspended', 'Your school\u2019s access is paused. Ask your school administrator.');
  return {
    ok: true, token: session.token, refresh: session.refresh,
    person: T.publicPerson(Object.assign({}, profile, { email })),
    home: profile.role === 'owner' ? '#/owner' : profile.role === 'teacher' ? '#/teacher' : '#/home'
  };
}

/* ------------------------------------------------------------ routing ---- */
async function handle(req, res, url) {
  const pathname = String(url.pathname || '').replace(/\/+$/, '') || '/api/platform';
  const action = pathname.replace(/^\/api\/platform/, '') || '/';
  const m = method(req);

  if (m === 'OPTIONS') { res.statusCode = 204; res.setHeader('access-control-allow-origin', '*'); res.setHeader('access-control-allow-headers', 'authorization,content-type'); res.setHeader('access-control-allow-methods', 'GET,POST,PATCH,OPTIONS'); return res.end(''); }

  try {
    if (!db.enabled() && action !== '/health') {
      return send(res, 503, { ok: false, code: 'tenant_unavailable', error: 'Accounts are not set up on this server yet. Study pages still work.' });
    }
    if (action === '/health') {
      const h = await db.healthy();
      return send(res, 200, { ok: h.ok, code: h.code || null, accounts: db.enabled(), tenancy: db.enabled() });
    }

    /* ---- public: signup and login (rate-limited by the caller) ---- */
    if (action === '/signup' && m === 'POST') {
      const body = await readJson(req);
      return send(res, 201, await signup(body));
    }
    if (action === '/login' && m === 'POST') {
      const body = await readJson(req);
      return send(res, 200, await login(body));
    }
    if (action === '/logout' && m === 'POST') {
      // Supabase sessions are bearer tokens; the client discards its token.
      return send(res, 200, { ok: true });
    }

    /* ---- everything below needs a resolved person ---- */
    let profile = null;
    try { profile = await T.resolve(req); }
    catch (e) {
      if (e.status === 428 && e.user) {
        // Verified account with no profile: let the signup form finish the job
        // without asking for the password again.
        return send(res, 428, { ok: false, code: 'profile_missing', error: e.message });
      }
      throw e;
    }
    if (!profile) return send(res, 401, { ok: false, code: 'sign_in_required', error: 'Sign in to continue.' });
    // Suspended people and suspended schools lose everything but this probe.
    if (!profile.active && action !== '/me') {
      return send(res, 403, { ok: false, code: profile.school_status === 'suspended' ? 'school_suspended' : 'account_inactive',
        error: profile.school_status === 'suspended' ? 'Your school\u2019s access is paused.' : 'This account is not active.' });
    }
    if (action === '/me' && m === 'GET') {
      return send(res, 200, { ok: true, ...(await T.capabilities(profile)) });
    }

    /* ---- master admin ---- */
    if (action === '/schools' && m === 'GET') {
      T.requireOwner(profile);
      const rows = await db.all('select id, name, code, board, city, phone, status, plan, paid_until, note, created_at from schools order by name');
      return send(res, 200, { ok: true, schools: rows });
    }
    if (action === '/schools' && m === 'POST') {
      T.requireOwner(profile);
      const body = await readJson(req);
      const name = String(body.name || '').trim();
      if (name.length < 2 || name.length > 160) throw T.bad('Enter the school name.', 'bad_name');
      const code = String(body.code || '').trim().toLowerCase();
      if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(code)) throw T.bad('Use a school code of lowercase letters, digits and dashes.', 'bad_code');
      const board = ['cbse', 'icse', 'state', 'other'].includes(String(body.board || 'cbse')) ? String(body.board) : 'cbse';
      const row = await db.one(
        `insert into schools (name, code, board, city, phone, plan, paid_until, note)
         values ($1,$2,$3,$4,$5,$6,$7,$8) returning id, name, code, status`,
        [name, code, board, String(body.city || '').slice(0, 120), String(body.phone || '').slice(0, 40),
          ['trial', 'standard', 'custom'].includes(body.plan) ? body.plan : 'trial',
          /^\d{4}-\d{2}-\d{2}$/.test(String(body.paidUntil || '')) ? body.paidUntil : null,
          String(body.note || '').slice(0, 500)]);
      return send(res, 201, { ok: true, school: row });
    }
    const schoolMatch = /^\/schools\/([0-9a-f-]{36})$/.exec(action);
    if (schoolMatch && m === 'PATCH') {
      T.requireOwner(profile);
      const body = await readJson(req);
      const status = body.status == null ? null : String(body.status);
      if (status && !['active', 'suspended', 'archived'].includes(status)) throw T.bad('Unknown school status.', 'bad_status');
      const row = await db.one(
        `update schools set
           status = coalesce($2, status),
           name = coalesce(nullif($3, ''), name),
           plan = coalesce(nullif($4, ''), plan),
           paid_until = coalesce($5::date, paid_until),
           note = coalesce($6, note)
         where id = $1
         returning id, name, code, status, plan, paid_until`,
        [schoolMatch[1], status, String(body.name || '').slice(0, 160), String(body.plan || ''),
          /^\d{4}-\d{2}-\d{2}$/.test(String(body.paidUntil || '')) ? body.paidUntil : null,
          body.note == null ? null : String(body.note).slice(0, 500)]);
      if (!row) throw T.notFound('School not found.');
      return send(res, 200, { ok: true, school: row });
    }
    const ownerSchool = /^\/owner\/school\/([0-9a-f-]{36})$/.exec(action);
    if (ownerSchool && m === 'GET') {
      T.requireOwner(profile);
      return send(res, 200, { ok: true, ...(await roster.ownerSchoolSummary(profile, ownerSchool[1])) });
    }

    /* ---- teacher ---- */
    if (action === '/roster' && m === 'GET') {
      T.requireRole(profile, 'teacher');
      return send(res, 200, { ok: true, ...(await roster.teacherOverview(profile)) });
    }
    if (action === '/roster/student' && m === 'POST') {
      const body = await readJson(req);
      return send(res, 200, await roster.addStudent(profile, body));
    }
    if (action === '/roster/mark' && m === 'POST') {
      const body = await readJson(req);
      return send(res, 200, await roster.addMark(profile, body));
    }
    if (action === '/roster/score' && m === 'POST') {
      const body = await readJson(req);
      return send(res, 200, await roster.recordScore(profile, body));
    }
    if (action === '/teaching' && m === 'POST') {
      T.requireRole(profile, 'teacher');
      const body = await readJson(req);
      const cls = T.cleanClass(body.class);
      const subject = T.cleanSubject(body.subject);
      const row = await db.one(
        `insert into teaching (teacher_id, school_id, class_level, subject)
         values ($1,$2,$3,$4) on conflict (teacher_id, school_id, class_level, subject) do update set subject = excluded.subject
         returning id, class_level, subject`,
        [profile.id, profile.school_id, cls, subject]);
      return send(res, 200, { ok: true, teaching: row });
    }

    /* ---- content control (master admin and, per school, teachers) ---- */
    if (action === '/content' && m === 'GET') {
      T.requireRole(profile, 'owner', 'teacher', 'student');
      const scope = await T.scopeFor(profile, { class: url.searchParams.get('class'), subject: url.searchParams.get('subject') });
      if (!scope) return send(res, 200, { ok: true, topics: [], note: 'No teaching scope is set yet.' });
      return send(res, 200, { ok: true, scope, ...(await content.list(profile, scope, url.searchParams.get('chapter'))) });
    }
    if (action === '/content' && m === 'POST') {
      const body = await readJson(req);
      return send(res, 200, await content.update(profile, body));
    }
    if (action === '/content/import' && m === 'POST') {
      T.requireOwner(profile);
      return send(res, 200, await content.importFromData(profile));
    }

    /* ---- study records ---- */
    if (action === '/records' && m === 'GET') {
      T.requireRole(profile, 'student', 'teacher', 'owner');
      return send(res, 200, await recordsList(profile, url));
    }
    if (action === '/records' && m === 'POST') {
      T.requireRole(profile, 'student');
      const body = await readJson(req);
      return send(res, 201, await recordsAdd(profile, body));
    }

    return send(res, 404, { ok: false, code: 'not_found', error: 'No such platform action.' });
  } catch (e) {
    const status = Number(e && e.status) || 500;
    const code = (e && e.code) || 'platform_error';
    const message = status >= 500 && !(e && e.expose)
      ? 'The account service is unavailable right now. Study pages still work.'
      : String((e && e.message) || 'Request failed.');
    return send(res, status, Object.assign({ ok: false, code, error: message }, e && e.detail ? { detail: e.detail } : {}));
  }
}

/* ---------------------------------------------------------- records ----- */
function cleanKind(value) {
  return ['answer', 'tutor', 'practice', 'mock', 'question'].includes(String(value)) ? String(value) : 'answer';
}

async function recordsAdd(profile, body) {
  const subject = T.cleanSubject(body.subject);
  const cls = T.cleanClass(body.class || profile.class_level || 10);
  const row = await db.one(
    `insert into study_events (student_id, school_id, class_level, subject, topic_id, kind, correct, source, detail)
     values ($1,$2,$3,$4,$5,$6,$7,'student',$8)
     returning id, created_at`,
    [profile.id, profile.school_id, cls, subject, body.topicId ? String(body.topicId).slice(0, 200) : null,
      cleanKind(body.kind), body.correct === true, JSON.stringify({ marks: Number(body.marks) || null }).slice(0, 2000)]);
  return { ok: true, event: row };
}

async function recordsList(profile, url) {
  const subject = url.searchParams.get('subject');
  const limit = Math.max(1, Math.min(200, Number(url.searchParams.get('limit')) || 60));
  if (profile.role === 'student') {
    const rows = await db.all(
      `select id, class_level as class, subject, topic_id, kind, correct, created_at
         from study_events where student_id = $1 order by created_at desc limit $2`, [profile.id, limit]);
    const summary = await db.one(
      `select count(*) as total, count(*) filter (where correct) as correct
         from study_events where student_id = $1`, [profile.id]);
    return { ok: true, events: rows, summary };
  }
  if (profile.role === 'teacher') {
    const rows = await db.all(
      `select e.id, e.student_id, p.full_name as student, e.class_level as class, e.subject, e.kind, e.correct, e.created_at
         from study_events e join profiles p on p.id = e.student_id
        where e.school_id = $1 ${subject ? 'and e.subject = $2' : ''}
        order by e.created_at desc limit $${subject ? 3 : 2}`,
      subject ? [profile.school_id, subject, limit] : [profile.school_id, limit]);
    return { ok: true, events: rows };
  }
  const schoolId = url.searchParams.get('school');
  const rows = await db.all(
    `select date_trunc('day', created_at)::date as day, count(*) as events,
            count(*) filter (where correct) as correct
       from study_events ${schoolId ? 'where school_id = $1' : ''}
      group by 1 order by 1 desc limit $${schoolId ? 2 : 1}`,
    schoolId ? [schoolId, limit] : [limit]);
  return { ok: true, activity: rows };
}

module.exports = { handle, signup, login, readJson, send, HttpError };
