import React, {useEffect, useMemo, useState} from 'react';
import {api} from '../api.js';

/* A student's own page: what they have answered, accuracy, and the class
   ranking their teacher sees. Only the server decides which rows are theirs. */
export function StudentHome({caps, scope}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api.records({limit: 80}).then(setData).catch(e => setError(e.message));
  }, []);

  const events = data?.events || [];
  const summary = data?.summary || {};
  const accuracy = Number(summary.total) ? Math.round(Number(summary.correct) / Number(summary.total) * 100) : null;
  const bySubject = useMemo(() => {
    const map = new Map();
    for (const e of events) {
      const key = e.subject || 'other';
      const entry = map.get(key) || {subject: key, total: 0, correct: 0};
      entry.total++; if (e.correct) entry.correct++;
      map.set(key, entry);
    }
    return [...map.values()].map(s => ({...s, accuracy: Math.round(s.correct / s.total * 100)}));
  }, [events]);

  return <div className="stack">
    <section className="page-head">
      <span className="eyebrow"><span className="dot"/>My work</span>
      <h2>{caps.person?.name ? 'Hello, ' + caps.person.name.split(' ')[0] : 'Your progress'}</h2>
      <p>Everything you answer with the tutor or in practice is recorded here for you and your teacher. Your school and class come from your account, so the site only shows your course.</p>
    </section>
    {error && <div className="callout bad" role="alert">{error}</div>}
    <div className="grid grid-3">
      <div className="stat"><strong>{summary.total ?? '—'}</strong><span>answers recorded</span></div>
      <div className="stat"><strong>{accuracy == null ? '—' : accuracy + '%'}</strong><span>correct so far</span></div>
      <div className="stat"><strong>{caps.person?.class ?? '—'}</strong><span>your class · {String(caps.person?.board || '').toUpperCase()}</span></div>
    </div>
    <section>
      <div className="section-title"><h3>By subject</h3><span className="muted">from your own answers</span></div>
      {bySubject.length ? <div className="grid grid-3">{bySubject.map(s => <div key={s.subject} className="card flat">
        <h3 style={{textTransform: 'capitalize'}}>{s.subject}</h3>
        <p>{s.total} answered · {s.accuracy}% correct</p>
      </div>)}</div> : <div className="empty">No answers yet. Ask a question in the study chat — answered questions are counted when you say how it went.</div>}
    </section>
    <section>
      <div className="section-title"><h3>Recent answers</h3><a className="btn btn-primary btn-sm" href="#/chat">Ask a question</a></div>
      {events.length ? <table className="table">
        <thead><tr><th>When</th><th>Subject</th><th>Chapter</th><th>Result</th></tr></thead>
        <tbody>{events.slice(0, 20).map(e => <tr key={e.id}>
          <td>{new Date(e.created_at).toLocaleString()}</td>
          <td style={{textTransform: 'capitalize'}}>{e.subject}</td>
          <td>{e.topic_id || '—'}</td>
          <td>{e.correct ? <span className="tag green">Correct</span> : e.correct === false ? <span className="tag cream">Not yet</span> : <span className="muted">Recorded</span>}</td>
        </tr>)}</tbody>
      </table> : <div className="empty">Nothing recorded yet.</div>}
    </section>
    <section>
      <div className="section-title"><h3>Class ranking</h3><span className="muted">set by your teacher</span></div>
      <p className="muted">Your teacher sees the class ranking and can mark a topic as important or removed. Rankings appear here once your teacher adds you to your class.</p>
    </section>
  </div>;
}
