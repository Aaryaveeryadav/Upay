'use strict';
/* Which chapters and topics the site shows, and to whom.
 *
 *   content_topics  the platform list. The master admin publishes or removes a
 *                   topic for every school, with a reason that students see.
 *   school_content  one school's override: hide a topic for its own students,
 *                   or raise its exam priority when a teacher marks it.
 *
 * A teacher may only touch their own school and their own (class, subject).
 * A student sees published topics minus their school's hidden ones.
 */
const db = require('./db.js');
const T = require('./tenancy.js');
const subjectIndex = require('./subject-index.js');
const rag = require('./science-rag.js');

const ID_RE = /^[a-z0-9][a-z0-9:._-]{2,120}$/i;

/* The platform's chapter list, generated from the data the app serves. */
function scienceTopics() {
  const { chunks } = rag.loadIndex();
  const byChapter = new Map();
  for (const chunk of chunks) {
    if (chunk.chapter == null) continue;
    const key = Number(chunk.chapter);
    if (!byChapter.has(key)) byChapter.set(key, { title: chunk.chapterTitle || '', sections: new Set() });
    const entry = byChapter.get(key);
    if (chunk.chapterTitle && !entry.title) entry.title = chunk.chapterTitle;
    if (chunk.section) entry.sections.add(String(chunk.section));
  }
  const topics = [];
  for (const [chapter, entry] of [...byChapter.entries()].sort((a, b) => a[0] - b[0])) {
    topics.push({ id: 'sci10:c' + chapter, class: 10, subject: 'science', chapter, kind: 'chapter',
      title: entry.title || ('Chapter ' + chapter), parent: null });
  }
  return topics;
}

function dataTopics() {
  const topics = [];
  for (const [key, info] of Object.entries(subjectIndex.availability())) {
    if (!info.ready) continue;
    const rows = subjectIndex.chapterRows(info.class, info.subject);
    const seen = new Map();
    for (const row of rows) {
      if (row.chapter == null || row.docType === 'pyq') continue;
      const title = row.chapterTitle || ('Chapter ' + row.chapter);
      if (seen.has(row.chapter)) continue;
      seen.set(row.chapter, true);
      topics.push({ id: 's' + info.class + ':' + info.subject + ':c' + row.chapter, class: info.class,
        subject: info.subject, chapter: row.chapter, kind: 'chapter', title, parent: null });
    }
  }
  return topics;
}

/* Import every chapter the app can serve. Idempotent: existing ids are updated.
   Returns counts so the master admin screen can show progress. */
async function importFromData(profile) {
  T.requireOwner(profile);
  const all = scienceTopics().concat(dataTopics());
  let inserted = 0, updated = 0;
  for (const topic of all) {
    if (!topic.title || topic.title.length > 200) continue;
    const row = await db.one(
      `insert into content_topics (id, class_level, subject, chapter_no, kind, title, published, updated_by)
       values ($1,$2,$3,$4,$5,$6,true,$7)
       on conflict (id) do update set title = excluded.title, chapter_no = excluded.chapter_no,
         updated_by = excluded.updated_by, updated_at = now()
       returning (xmax = 0) as fresh`,
      [topic.id, topic.class, topic.subject, topic.chapter, topic.kind, topic.title, profile.id]);
    if (row && row.fresh) inserted++; else updated++;
  }
  return { ok: true, total: all.length, inserted, updated };
}

async function list(profile, scope, chapter) {
  const chapterNo = chapter != null && chapter !== '' ? Number(chapter) : null;
  const rows = await db.all(
    `select ct.id, ct.class_level as class, ct.subject, ct.chapter_no as chapter, ct.kind, ct.title,
            ct.title_hi, ct.published, ct.removed_reason,
            coalesce(sc.visible, true) as school_visible,
            coalesce(sc.exam_weight, 0) as exam_weight
       from content_topics ct
       left join school_content sc on sc.topic_id = ct.id and sc.school_id = $3
      where ct.class_level = $1 and ct.subject = $2
        ${chapterNo != null ? 'and ct.chapter_no = $4' : ''}
      order by ct.chapter_no nulls last, ct.kind, ct.title`,
    chapterNo != null ? [scope.class, scope.subject, profile.school_id, chapterNo] : [scope.class, scope.subject, profile.school_id]);
  const topics = rows.filter(r => profile.role === 'owner' || (r.published && r.school_visible))
    .map(r => ({
      id: r.id, chapter: r.chapter, kind: r.kind, title: r.title, titleHi: r.title_hi,
      published: r.published, visible: r.published && r.school_visible,
      examWeight: Number(r.exam_weight) || 0,
      note: profile.role === 'owner' || profile.role === 'teacher' ? r.removed_reason : ''
    }));
  return { topics, count: topics.length, role: profile.role };
}

async function update(profile, body) {
  const topicId = String(body.topicId || '');
  if (!ID_RE.test(topicId)) throw T.bad('Unknown topic.', 'bad_topic');
  const topic = await db.one('select id, class_level, subject from content_topics where id = $1', [topicId]);
  if (!topic) throw T.notFound('Topic not found.');
  if (profile.role === 'owner') {
    const published = body.published !== false;
    const row = await db.one(
      `update content_topics set published = $2, removed_reason = $3, updated_by = $4, updated_at = now()
       where id = $1 returning id, published, removed_reason`,
      [topicId, published, String(body.reason || '').slice(0, 500), profile.id]);
    return { ok: true, topic: row };
  }
  T.requireRole(profile, 'teacher');
  const scope = await T.scopeFor(profile, body);
  if (!scope || topic.class_level !== scope.class || topic.subject !== scope.subject) {
    throw T.forbidden('That topic is outside your classes.', 'out_of_scope');
  }
  const visible = body.visible !== false;
  const weight = Math.max(0, Math.min(5, Number(body.examWeight) || 0));
  await db.query(
    `insert into school_content (school_id, topic_id, visible, exam_weight, note, updated_by, updated_at)
     values ($1,$2,$3,$4,$5,$6,now())
     on conflict (school_id, topic_id) do update set visible = excluded.visible, exam_weight = excluded.exam_weight,
       note = excluded.note, updated_by = excluded.updated_by, updated_at = now()`,
    [profile.school_id, topicId, visible, weight, String(body.note || '').slice(0, 500), profile.id]);
  return { ok: true, topic: { id: topicId, visible, examWeight: weight } };
}

/* Is a topic visible for this person right now? Used by the chat gate so a
   hidden chapter is never cited to that school's students. */
async function visibleTopicIds(profile, scope) {
  if (!profile || !profile.school_id) {
    const rows = await db.all('select id from content_topics where published and class_level = $1 and subject = $2', [scope.class, scope.subject]);
    return new Set(rows.map(r => r.id));
  }
  const rows = await db.all(
    `select ct.id from content_topics ct
       left join school_content sc on sc.topic_id = ct.id and sc.school_id = $3
      where ct.published and coalesce(sc.visible, true) and ct.class_level = $1 and ct.subject = $2`,
    [scope.class, scope.subject, profile.school_id]);
  return new Set(rows.map(r => r.id));
}

/* Topic id for a retrieved row, so a citation can be filtered by visibility. */
function topicIdFor(scope, row) {
  if (row.chapter == null) return null;
  if (['science', 'physics', 'chemistry', 'biology'].includes(String(scope.subject))) return 'sci10:c' + row.chapter;
  return 's' + scope.class + ':' + scope.subject + ':c' + row.chapter;
}

module.exports = { importFromData, list, update, visibleTopicIds, topicIdFor, scienceTopics, dataTopics };
