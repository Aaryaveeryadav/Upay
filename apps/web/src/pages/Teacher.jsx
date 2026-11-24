import React, {useEffect, useMemo, useState} from 'react';
import {api} from '../api.js';
import {subjectLabel} from '../roles.js';

/* Teacher screens: the classes they teach, the students in each, the ranking,
   adding a signed-up student, marking a topic (priority/removed/formula), and
   recording a mark. A teacher only ever sees their own school. */
export function Teacher({caps, scope, setScope}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [teaching, setTeaching] = useState({class: 10, subject: 'science'});
  const [mark, setMark] = useState({kind: 'priority', body: ''});

  const load = () => api.roster().then(d => { setData(d); setError(''); }).catch(e => setError(e.message));
  useEffect(() => { load(); }, []);

  const students = useMemo(() => {
    if (!data) return [];
    const cls = scope?.class;
    const subj = scope?.subject;
    return (data.students || []).filter(s => s.class === cls);
  }, [data, scope]);

  async function run(fn, okMessage) {
    setBusy(true); setError(''); setNotice('');
    try { await fn(); setNotice(okMessage); await load(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  return <div className="stack">
    <section className="page-head">
      <span className="eyebrow"><span className="dot"/>My classes</span>
      <h2>Teach, mark and rank</h2>
      <p>Your school is fixed by your account. Add the classes and subjects you teach, add students who have signed up, mark what matters for the exam, and record marks. The ranking is by answers recorded.</p>
    </section>
    {error && <div className="callout bad" role="alert">{error}</div>}
    {notice && <div className="callout good" role="status">{notice}</div>}

    <div className="grid grid-2">
      <section className="card">
        <h3>What I teach</h3>
        <div className="chip-row" style={{marginBottom: 12}}>
          {(data?.teaching || []).map(t => <button key={t.class + t.subject} className="chip" type="button"
            onClick={() => setScope({class: t.class, subject: t.subject})}
            aria-pressed={scope?.class === t.class && scope?.subject === t.subject}>
            Class {t.class} · {subjectLabel(t.subject)}
          </button>)}
          {!data?.teaching?.length && <span className="muted">No teaching pairs yet — add one below.</span>}
        </div>
        <div className="form-grid">
          <label className="field"><span>Class</span>
            <select value={teaching.class} onChange={e => setTeaching({...teaching, class: Number(e.target.value)})}>{[8, 9, 10, 11, 12].map(c => <option key={c} value={c}>Class {c}</option>)}</select></label>
          <label className="field"><span>Subject</span>
            <select value={teaching.subject} onChange={e => setTeaching({...teaching, subject: e.target.value})}>
              {(caps.subjects || []).filter(s => s.class === teaching.class).map(s => <option key={s.subject} value={s.subject}>{s.title}</option>)}
            </select></label>
        </div>
        <button className="btn btn-primary btn-sm" style={{marginTop: 12}} disabled={busy}
          onClick={() => run(() => api.addTeaching(teaching), 'Added to your teaching list.')}>Add class & subject</button>
      </section>

      <section className="card">
        <h3>Add a student</h3>
        <p style={{marginBottom: 10}}>The student signs up first (same login page), then you attach them to your school by email.</p>
        <label className="field"><span>Student email</span>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="student@example.com"/></label>
        <button className="btn btn-primary btn-sm" style={{marginTop: 12}} disabled={busy || !email.includes('@')}
          onClick={() => run(() => api.addStudent(email.trim()), 'Student added to your school.')}>Add student</button>
      </section>
    </div>

    <section>
      <div className="section-title">
        <h3>Class {scope?.class} · {subjectLabel(scope?.subject)} — ranking</h3>
        <span className="muted">{students.length} students</span>
      </div>
      {students.length ? <table className="table">
        <thead><tr><th>#</th><th>Student</th><th>Answers</th><th>Correct</th><th>Accuracy</th><th>Last seen</th><th>Record a mark</th></tr></thead>
        <tbody>{students.map(s => <tr key={s.id}>
          <td className="rank">{s.rank || '—'}</td>
          <td>{s.name}</td>
          <td>{s.answers}</td>
          <td>{s.correct}</td>
          <td>{s.accuracy == null ? '—' : s.accuracy + '%'}</td>
          <td>{s.last_seen ? new Date(s.last_seen).toLocaleDateString() : '—'}</td>
          <td><div className="row" style={{gap: 6}}>
            <button className="btn btn-sm" disabled={busy} onClick={() => run(() => api.recordScore({studentId: s.id, correct: true, class: scope.class, subject: scope.subject}), 'Marked correct for ' + s.name + '.')}>Correct</button>
            <button className="btn btn-sm" disabled={busy} onClick={() => run(() => api.recordScore({studentId: s.id, correct: false, class: scope.class, subject: scope.subject}), 'Marked not yet for ' + s.name + '.')}>Not yet</button>
          </div></td>
        </tr>)}</tbody>
      </table> : <div className="empty">No students in this class yet. Ask them to sign up, then add their email above.</div>}
    </section>

    <section className="card">
      <h3>Topics for this class</h3>
      <p style={{marginBottom: 12}}>Mark a topic as very likely in the exam, or hide it if it is removed from the syllabus. Students in your school see your choice in the chat and practice.</p>
      <TopicsForScope scope={scope} caps={caps} onChanged={load}/>
    </section>

    <section className="card">
      <h3>Notes on this class</h3>
      <div className="form-grid">
        <label className="field"><span>Kind</span>
          <select value={mark.kind} onChange={e => setMark({...mark, kind: e.target.value})}>
            <option value="priority">Very likely in the exam</option>
            <option value="removed">Removed from the syllabus</option>
            <option value="formula">Formula to memorise</option>
            <option value="note">General note</option>
          </select></label>
        <label className="field wide"><span>Note</span>
          <textarea rows={2} value={mark.body} onChange={e => setMark({...mark, body: e.target.value})} maxLength={2000} placeholder="e.g. Numerical from this formula appeared in the last two papers."/></label>
      </div>
      <button className="btn btn-primary btn-sm" style={{marginTop: 10}} disabled={busy || !mark.body.trim()}
        onClick={() => run(() => api.addMark({...mark, class: scope?.class, subject: scope?.subject}), 'Note saved for your class.')}>Save note</button>
      <div className="list" style={{marginTop: 14}}>
        {(data?.marks || []).slice(0, 8).map(m => <div key={m.id} className="row" style={{borderTop: '1px solid var(--line-2)', paddingTop: 8}}>
          <span><span className={'tag ' + (m.kind === 'removed' ? 'cream' : 'green')}>{m.kind}</span> {m.body || m.topic_id}</span>
          <span className="muted">Class {m.class} · {subjectLabel(m.subject)}</span>
        </div>)}
      </div>
    </section>
  </div>;
}

/* The topic list for the selected class/subject, with a priority/hide toggle. */
export function TopicsForScope({scope, caps, onChanged}) {
  const [topics, setTopics] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const editable = caps.role === 'owner' || caps.role === 'teacher';

  const load = () => api.content(scope?.class, scope?.subject).then(d => { setTopics(d.topics || []); setError(''); }).catch(e => setError(e.message));
  useEffect(() => { load(); }, [scope?.class, scope?.subject]);

  async function toggle(topic, patch) {
    setBusyId(topic.id); setError('');
    try {
      const payload = caps.role === 'owner'
        ? {topicId: topic.id, published: patch.published}
        : {topicId: topic.id, class: scope.class, subject: scope.subject, visible: patch.visible, examWeight: patch.examWeight};
      await api.setContent(payload);
      await load();
      onChanged?.();
    } catch (e) { setError(e.message); }
    finally { setBusyId(''); }
  }

  if (error) return <div className="callout bad" role="alert">{error}</div>;
  if (!topics) return <div className="loading">Loading topics…</div>;
  if (!topics.length) return <div className="empty">No topics are listed for this class and subject yet. The master admin can import them from the app’s own chapter data.</div>;
  return <div className="list">
    {topics.map(t => <div key={t.id} className="row" style={{borderTop: '1px solid var(--line-2)', paddingTop: 8}}>
      <span>
        <b>Ch {t.chapter}</b> {t.title} {t.examWeight ? <span className="tag green">exam priority {t.examWeight}/5</span> : null}
        {!t.visible && <span className="tag cream">hidden</span>}
      </span>
      {editable && <span className="row" style={{gap: 6}}>
        {caps.role === 'teacher' && <>
          <button className="btn btn-sm" disabled={busyId === t.id} onClick={() => toggle(t, {visible: t.visible, examWeight: Math.min(5, (t.examWeight || 0) + 1)})}>Priority +</button>
          <button className="btn btn-sm" disabled={busyId === t.id} onClick={() => toggle(t, {visible: !t.visible, examWeight: t.examWeight})}>{t.visible ? 'Hide' : 'Show'}</button>
        </>}
        {caps.role === 'owner' && <button className="btn btn-sm" disabled={busyId === t.id} onClick={() => toggle(t, {published: !t.published})}>{t.published ? 'Remove everywhere' : 'Publish'}</button>}
      </span>}
    </div>)}
  </div>;
}
