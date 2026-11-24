'use strict';
/* Roster and records for the school and teacher screens.
 *
 * Everything here is scoped on the server: a teacher's queries are restricted
 * to their own school and to the (class, subject) pairs recorded in `teaching`.
 * The master admin may inspect a school but never needs a teacher's scope.
 */
const db = require('./db.js');
const T = require('./tenancy.js');

async function listTeaching(profile) {
  return db.all('select class_level as class, subject from teaching where teacher_id = $1 order by class_level, subject', [profile.id]);
}

/* A teacher's classes with a headcount and last-seen time. */
async function teacherOverview(profile) {
  T.requireRole(profile, 'teacher');
  const teaching = await listTeaching(profile);
  const people = await db.all(
    `select p.id, p.full_name as name, p.class_level as class, p.status, p.created_at,
            (select max(created_at) from study_events e where e.student_id = p.id) as last_seen,
            (select count(*) from study_events e where e.student_id = p.id) as answers,
            (select count(*) from study_events e where e.student_id = p.id and e.correct) as correct
       from profiles p
      where p.school_id = $1 and p.role = 'student' and p.class_level = any($2::int[])
      order by p.full_name`,
    [profile.school_id, teaching.map(t => t.class)]);
  const students = people.map(s => ({
    ...s,
    answers: Number(s.answers || 0),
    correct: Number(s.correct || 0),
    accuracy: Number(s.answers) ? Math.round(Number(s.correct) / Number(s.answers) * 100) : null
  }));
  students.sort((a, b) => (b.answers || 0) - (a.answers || 0));
  students.forEach((s, i) => { s.rank = s.answers ? i + 1 : null; });
  const groups = await db.all(
    'select id, class_level as class, section from class_groups where school_id = $1 order by class_level, section',
    [profile.school_id]);
  const marks = await db.all(
    `select id, class_level as class, subject, topic_id, kind, body, created_at
       from teacher_marks where teacher_id = $1 order by created_at desc limit 200`, [profile.id]);
  return { teaching, students, groups, marks };
}

/* Add a student to the school by email. The account must already exist (the
   person signed up) — the teacher never sets a password for someone else. */
async function addStudent(profile, body) {
  T.requireRole(profile, 'teacher');
  const email = String(body && body.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw T.bad('Enter the student\u2019s email.', 'bad_email');
  const row = await db.one(
    `select id, full_name, class_level, school_id from profiles
      where email_join = $1 or id::text = $1 limit 1`, [email]);
  if (!row) throw T.notFound('No account uses that email yet. Ask the student to sign up first.');
  if (row.school_id && row.school_id !== profile.school_id) throw T.forbidden('That account belongs to another school.');
  await db.query('update profiles set school_id = coalesce(school_id, $1), status = \'active\' where id = $2', [profile.school_id, row.id]);
  return { ok: true, student: { id: row.id, name: row.full_name, class: row.class_level } };
}

/* A teacher marks a topic as likely / removed / a formula note. */
async function addMark(profile, body) {
  T.requireRole(profile, 'teacher');
  const kind = String(body && body.kind || 'priority');
  if (!['priority', 'removed', 'formula', 'note'].includes(kind)) throw T.bad('Unknown mark kind.', 'bad_kind');
  const scope = await T.scopeFor(profile, body);
  const topicId = body && body.topicId ? String(body.topicId) : null;
  const note = String(body && body.body || '').slice(0, 2000);
  const row = await db.one(
    `insert into teacher_marks (teacher_id, school_id, class_level, subject, topic_id, kind, body)
     values ($1,$2,$3,$4,$5,$6,$7) returning id, kind, topic_id, body, created_at`,
    [profile.id, profile.school_id, scope.class, scope.subject, topicId, kind, note]);
  if (topicId) {
    await db.query(
      `insert into school_content (school_id, topic_id, visible, exam_weight, updated_by, updated_at)
       values ($1,$2,$3,$4,$5,now())
       on conflict (school_id, topic_id)
       do update set visible = excluded.visible, exam_weight = excluded.exam_weight, updated_by = excluded.updated_by, updated_at = now()`,
      [profile.school_id, topicId, kind !== 'removed', kind === 'priority' ? 4 : 0, profile.id]).catch(() => {});
  }
  return { ok: true, mark: row };
}

/* A teacher records a score for a student (and can see the class ranking). */
async function recordScore(profile, body) {
  T.requireRole(profile, 'teacher');
  const studentId = String(body && body.studentId || '');
  const correct = body && body.correct === true;
  if (!studentId) throw T.bad('Choose a student.', 'bad_student');
  const student = await db.one('select id, school_id from profiles where id = $1 and role = \'student\'', [studentId]);
  if (!student) throw T.notFound('Student not found.');
  if (student.school_id !== profile.school_id) throw T.forbidden();
  const scope = await T.scopeFor(profile, body);
  await db.query(
    `insert into study_events (student_id, school_id, class_level, subject, topic_id, kind, correct, source, detail)
     values ($1,$2,$3,$4,$5,'answer',$6,'teacher',$7)`,
    [studentId, profile.school_id, scope.class, scope.subject, body.topicId || null, correct,
      JSON.stringify({ by: profile.id, note: String(body.note || '').slice(0, 500) })]);
  return { ok: true };
}

/* School-wide view for the master admin: counts, activity, content overrides. */
async function ownerSchoolSummary(profile, schoolId) {
  T.requireOwner(profile);
  const school = await db.one('select id, name, code, board, city, status, plan, paid_until, note from schools where id = $1', [schoolId]);
  if (!school) throw T.notFound('School not found.');
  const counts = await db.one(
    `select count(*) filter (where role = 'student') as students,
            count(*) filter (where role = 'teacher') as teachers
       from profiles where school_id = $1`, [schoolId]);
  const activity = await db.all(
    `select date_trunc('day', created_at)::date as day, count(*) as events
       from study_events where school_id = $1 and created_at > now() - interval '30 days'
      group by 1 order by 1`, [schoolId]);
  const overrides = await db.all(
    `select sc.topic_id, ct.title, sc.visible, sc.exam_weight
       from school_content sc join content_topics ct on ct.id = sc.topic_id
      where sc.school_id = $1 order by sc.updated_at desc limit 100`, [schoolId]);
  return { school, counts, activity, overrides };
}

module.exports = { listTeaching, teacherOverview, addStudent, addMark, recordScore, ownerSchoolSummary };
