import React, {useEffect, useMemo, useState} from 'react';
import {subjectLabel} from '../roles.js';

/* Practice: the board questions the app already carries, filtered to the
   student's own class and subject. Asking about one opens the chat with it
   filled in, so the tutor answers from the same chapter. */

// The same packs the legacy pages load, one file per class/subject.
const DATA_FILES = {
  '10:maths': ['/assets/js/data/pyq.js', '/assets/js/data/pyq-2024.js'],
  '10:science': ['/assets/js/data/pyq-science.js'],
  '10:social': ['/assets/js/data/pyq-social.js'],
  '10:english': ['/assets/js/data/pyq-english.js'],
  '10:hindi': ['/assets/js/data/pyq-hindi-final.js'],
  '12:maths': ['/assets/js/data/pyq-cbse2025-cls12.js'],
  '12:physics': ['/assets/js/data/pyq-physics-2025.js'],
  '12:chemistry': ['/assets/js/data/pyq-chemistry-2025.js']
};

// Packs are plain scripts that add to window.UP; load each file once.
const loaded = new Map();
function loadScript(src) {
  // The packs append to window.UP (`UP.pyq = UP.pyq.concat(...)`), so the
  // container must exist before the first one runs.
  window.UP = window.UP || {};
  if (!Array.isArray(window.UP.pyq)) window.UP.pyq = [];
  if (!loaded.has(src)) {
    loaded.set(src, new Promise(resolve => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    }));
  }
  return loaded.get(src);
}

export function Practice({caps, scope}) {
  const cls = caps.role === 'student' ? (caps.person?.class || scope?.class || 10) : (scope?.class || 10);
  const subject = scope?.subject || 'science';
  const [rows, setRows] = useState(null);
  const [query, setQuery] = useState('');
  const [chapter, setChapter] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    const files = DATA_FILES[`${cls}:${subject}`];
    setError(''); setChapter('all');
    if (!files) { setRows([]); return; }
    let live = true;
    setRows(null);
    Promise.all(files.map(loadScript)).then(loadedOk => {
      if (!live) return;
      // A pack that fails to download still leaves the others' rows usable.
      if (!loadedOk.some(Boolean)) setError('The question bank could not be loaded. Check your connection and try again.');
      const all = (window.UP && window.UP.pyq) || [];
      setRows(all.filter(q => q.cls === cls && q.subject === subject && q.en));
    });
    return () => { live = false; };
  }, [cls, subject]);

  const chapters = useMemo(() => [...new Set((rows || []).map(r => r.ch).filter(Boolean))].sort((a, b) => a - b), [rows]);
  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (rows || [])
      .filter(r => (chapter === 'all' || String(r.ch) === String(chapter)) && (!term || String(r.en).toLowerCase().includes(term)))
      .slice(0, 120);
  }, [rows, query, chapter]);

  return <div className="stack">
    <section className="page-head">
      <span className="eyebrow"><span className="dot"/>Practice</span>
      <h2>{subjectLabel(subject)} questions from your course</h2>
      <p>Real board questions from this app’s reviewed papers for Class {cls} {subjectLabel(subject)}. Ask the tutor about any of them: it answers from the chapter and shows the page it read, and if the book does not cover the question it says so instead of guessing.</p>
    </section>
    {error && <div className="callout bad" role="alert">{error}</div>}
    <div className="form-grid">
      <label className="field"><span>Search these questions</span><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search a word or phrase"/></label>
      <label className="field"><span>Chapter</span><select value={chapter} onChange={e => setChapter(e.target.value)}>
        <option value="all">All chapters</option>{chapters.map(c => <option key={c} value={c}>Chapter {c}</option>)}
      </select></label>
    </div>
    {rows == null ? <div className="loading">Loading questions…</div>
      : visible.length === 0 ? <div className="empty">{rows.length === 0
        ? `No board questions for ${subjectLabel(subject)} Class ${cls} are in this app yet. Ask the tutor directly instead.`
        : 'No question matches that search.'}
      </div>
      : <>
        <div className="muted">{visible.length} of {rows.length} questions shown{visible.length === 120 ? ' (first 120; narrow the search to see more)' : ''}</div>
        <div className="grid">
          {visible.map(q => <article key={q.id} className="card">
            <div className="row" style={{gap: 8, justifyContent: 'flex-start', marginBottom: 8}}>
              {q.y ? <span className="tag grey">{q.y}</span> : null}
              <span className="tag grey">{q.ch ? 'Chapter ' + q.ch : 'Mixed'}</span>
              {q.m ? <span className="tag grey">{q.m} {q.m === 1 ? 'mark' : 'marks'}</span> : null}
              {q.board ? <span className="tag grey">{String(q.board).toUpperCase()}</span> : null}
            </div>
            <p style={{whiteSpace: 'pre-wrap', color: 'var(--ink)'}}>{q.en}</p>
            <div className="row" style={{marginTop: 12, gap: 8}}>
              <a className="btn btn-sm btn-primary" href={'#/chat?q=' + encodeURIComponent(q.en)}>Ask the tutor</a>
              {q.src ? <span className="muted">Source: {q.src}</span> : null}
            </div>
          </article>)}
        </div>
      </>}
  </div>;
}
