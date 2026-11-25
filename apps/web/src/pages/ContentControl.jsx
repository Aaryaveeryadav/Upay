import React from 'react';
import {TopicsForScope} from './Teacher.jsx';
import {subjectLabel} from '../roles.js';

/* Content control for both roles: the master admin publishes or removes a
   chapter for every school; a teacher hides or prioritises one for their own
   school. The same component is used, with the server deciding what each may
   write. */
export function ContentControl({caps, scope, setScope}) {
  const isOwner = caps.role === 'owner';
  return <div className="stack">
    <section className="page-head">
      <span className="eyebrow"><span className="dot"/>{isOwner ? 'Content control' : 'Syllabus control'}</span>
      <h2>{isOwner ? 'What every school can see' : 'What your school studies'}</h2>
      <p>{isOwner
        ? 'Removing a chapter here removes it for every school at once, with the reason shown to students. Teachers can still hide a chapter for their own school.'
        : 'Hide a chapter if it is removed from your syllabus, or raise its exam priority when you expect a question from it. Students in your school see your choice in the chat.'}</p>
    </section>
    <div className="chat-scope">
      <span className="tag grey">Class {scope?.class} · {subjectLabel(scope?.subject)}</span>
      <select value={scope?.class || 10} onChange={e => setScope({...scope, class: Number(e.target.value)})} aria-label="Class">
        {[8, 9, 10, 11, 12].map(c => <option key={c} value={c}>Class {c}</option>)}
      </select>
      <select value={scope?.subject || 'science'} onChange={e => setScope({...scope, subject: e.target.value})} aria-label="Subject">
        {(caps.subjects || []).filter(s => s.class === (scope?.class || 10)).map(s => <option key={s.subject} value={s.subject}>{s.title}</option>)}
      </select>
    </div>
    <section className="card">
      <TopicsForScope scope={scope} caps={caps}/>
    </section>
    {isOwner && <div className="callout tip">The list comes from the app’s own reviewed chapter data. Use <b>Refresh content list</b> on the Schools page after adding new books or papers.</div>}
  </div>;
}
