import React, {useEffect, useMemo, useState} from 'react';
import {createRoot} from 'react-dom/client';
import './style.css';

// This first migrated view reads the same reviewed public data as the legacy app.
// It does not load unreviewed PDFs or claim AI answers are official keys.
const appHome = import.meta.env.DEV ? '/legacy/' : '/';
// The existing site intentionally disallows framing. Open it in a tab when
// this development preview is embedded; do not weaken its security headers.
const legacyTarget = import.meta.env.DEV ? {target:'_blank', rel:'noopener noreferrer'} : {};
function QuestionCard({question, onRelated, relatedCount}) {
  const text = question.en || '';
  const options = Array.isArray(question.opts) ? question.opts : [];
  const ask = text + (options.length ? '\nOptions: ' + options.map((o,i) => `${String.fromCharCode(65+i)}. ${typeof o === 'string' ? o : o.en || o.text || ''}`).join('  ') : '');
  return <article className="question-card">
    <div className="tags"><span>{question.session}</span><span>{question.chapter}</span><span>Question {question.q}</span><span>{question.m} {question.m === 1 ? 'mark' : 'marks'}</span></div>
    <p>{text}</p>
    {options.length > 0 && <ol className="options" type="A">{options.map((o,i) => <li key={i}>{typeof o === 'string' ? o : o.en || o.text}</li>)}</ol>}
    <div className="card-footer"><span>CBSE practice · PDF page {question.sourcePage} · No verified key</span>
      <div className="actions">{relatedCount > 0 && <button type="button" onClick={() => onRelated(question.chapter)}>See similar ({relatedCount})</button>}<a href={question.sourceUrl} target="_blank" rel="noreferrer">Source PDF ↗</a><a className="action-primary" {...legacyTarget} href={`${appHome}#/ask?q=${encodeURIComponent(ask)}`}>Ask AI →</a></div>
    </div>
  </article>;
}
function App() {
  const [rows, setRows] = useState([]);
  const [dataStatus, setDataStatus] = useState('loading');
  useEffect(() => {
    const script = document.createElement('script');
    script.src = '/assets/js/data/english10-supplied-practice.js';
    script.onload = () => {
      setRows((window.UP?.pyq || []).filter(q => q.cls === 10 && q.subject === 'english' && q.sourceType === 'practice'));
      setDataStatus('ready');
    };
    script.onerror = () => setDataStatus('error');
    document.head.appendChild(script);
    return () => { script.onload = null; script.onerror = null; script.remove(); };
  }, []);
  const [query, setQuery] = useState('');
  const [session, setSession] = useState('all');
  const [chapter, setChapter] = useState('all');
  const showRelated = (value) => { setQuery(''); setSession('all'); setChapter(value); document.getElementById('practice-heading')?.focus(); };
  const chapters = useMemo(() => [...new Set(rows.map(q => q.chapter).filter(Boolean))].sort(), [rows]);
  const sessions = useMemo(() => [...new Set(rows.map(q => q.session).filter(Boolean))].sort().reverse(), [rows]);
  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return rows.filter(q => (session === 'all' || q.session === session) && (chapter === 'all' || q.chapter === chapter) && (!term || [q.en,q.chapter,q.q].some(x => String(x || '').toLocaleLowerCase().includes(term))));
  }, [rows, query, session, chapter]);
  return <><header><div className="header-inner"><a className="brand" {...legacyTarget} href={appHome}>Kritin <strong>उpaay</strong></a><a className="back" {...legacyTarget} href={appHome}>← Back to the full site</a></div></header>
    <main><section className="hero"><div><div className="eyebrow">CBSE · CLASS 10 · ENGLISH</div><h1>Practise with purpose.</h1><p>Explore source-linked grammar, writing and literature questions from your supplied practice papers.</p></div><div className="hero-count"><strong>{rows.length}</strong><span>reviewed questions</span></div></section>
      <section className="notice"><strong>About this preview</strong><p>This is the first React-based view. It contains selected questions from two practice papers, not the full English bank. Other subjects and features remain on the existing site. AI explanations are not official answer keys. Similar questions are grouped by chapter or skill, not guaranteed to be the same question type.</p></section>
      <section aria-labelledby="practice-heading"><div className="section-heading"><div><div className="eyebrow">YOUR PRACTICE</div><h2 id="practice-heading" tabIndex={-1}>Find a question</h2></div><span aria-live="polite">{visible.length} {visible.length === 1 ? 'question' : 'questions'}</span></div>
      <div className="filters"><label>Search<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search questions or chapters" /></label><label>Paper<select value={session} onChange={e=>setSession(e.target.value)}><option value="all">All papers</option>{sessions.map(s=><option key={s}>{s}</option>)}</select></label><label>Chapter or skill<select value={chapter} onChange={e=>setChapter(e.target.value)}><option value="all">All chapters</option>{chapters.map(c=><option key={c}>{c}</option>)}</select></label></div>
      {dataStatus === 'loading' ? <div className="empty" role="status">Loading practice questions…</div> : dataStatus === 'error' || !rows.length ? <div className="empty" role="status">Practice data could not be loaded. Open the full site and try again.</div> : visible.length ? <div className="questions">{visible.map(q=><QuestionCard key={q.id} question={q} onRelated={showRelated} relatedCount={q.chapter ? rows.filter(other => other.id !== q.id && other.chapter === q.chapter).length : 0}/>)}</div> : <div className="empty" role="status">No questions match these filters. Try another search or chapter.</div>}</section>
    </main><footer>Built for thoughtful practice · <a {...legacyTarget} href={appHome}>Open the full site</a></footer></>;
}

createRoot(document.getElementById('root')).render(<App />);
