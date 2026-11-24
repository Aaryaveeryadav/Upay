import React, {useEffect, useRef, useState} from 'react';
import {api} from '../api.js';
import {subjectLabel} from '../roles.js';

/* Study chat: one question box for the whole syllabus.
   The model answers only from the app's own textbook/PYQ material, cites it as
   [1], and refuses anything outside the chosen class and subject. */
const STARTERS = {
  science: [
    'Why is a convex mirror used as a rear-view mirror?',
    'How does a soap micelle remove grease from clothes?',
    'Why are bags of chips flushed with nitrogen?',
    'State Ohm’s law and draw the circuit symbol.',
    'How does the nephron remove waste from blood?',
    'Balance: Fe + O2 → Fe2O3'
  ],
  maths: [
    'When is matrix multiplication defined?',
    'Find the roots of x² + 5x + 6 = 0.',
    'What is the difference between a relation and a function?',
    'Explain the section formula with an example.',
    'What does an inverse trigonometric function mean?',
    'State Bayes’ theorem in simple words.'
  ],
  social: [
    'Why are resources important for development?',
    'What is sustainable development?',
    'How did the Non-Cooperation Movement begin?',
    'What powers does the Supreme Court have?',
    'Why is water scarcity a problem in India?',
    'What is the difference between primary and tertiary sectors?'
  ],
  hindi: [
    'कबीर की साखी का भावार्थ समझाइए।',
    '“माता का आँचल” पाठ का सारांश लिखिए।',
    'संज्ञा और सर्वनाम में क्या अंतर है?',
    'अलंकार किसे कहते हैं? उदाहरण दीजिए।',
    'मुहावरे का अर्थ लिखिए: नौ दो ग्यारह होना।',
    'पत्र-लेखन का प्रारूप समझाइए।'
  ],
  english: [
    'Why did Lencho write a letter to God?',
    'What is the theme of the poem “Dust of Snow”?',
    'What is a pronoun? Give two examples.',
    'Write a letter to the editor about water scarcity.',
    'What did Mandela mean by freedom?',
    'Explain the difference between active and passive voice.'
  ]
};
const SUGGEST = [
  'What is the valency of carbon and why?',
  'A student says light travels in a straight line. Is that always true?',
  'Our teacher says a new numerical may come from this chapter — solve one more using the same formula.',
  'Why does a diamond conduct heat but not electricity?'
];

function escapeText(text) { return String(text == null ? '' : text); }

/* Render the model's answer as plain text with only [n] as links. Never inject
   HTML from the model. */
function AnswerText({text, count}) {
  const blocks = escapeText(text).split(/\n{2,}/);
  const cite = (line, key) => {
    const parts = [];
    let last = 0, match;
    const re = /\[(\d{1,2})\]/g;
    while ((match = re.exec(line))) {
      if (match.index > last) parts.push(<React.Fragment key={key + '-t' + parts.length}>{line.slice(last, match.index)}</React.Fragment>);
      const n = Number(match[1]);
      const valid = n >= 1 && n <= count;
      parts.push(valid
        ? <a key={key + '-c' + match.index} className="cite" href={'#source-' + n} data-cite={n}>{n}</a>
        : <mark key={key + '-b' + match.index} className="bad-cite">[{n}]</mark>);
      last = match.index + match[0].length;
    }
    if (last < line.length) parts.push(<React.Fragment key={key + '-tail'}>{line.slice(last)}</React.Fragment>);
    return parts;
  };
  return <div className="answer-text">{blocks.map((block, i) => {
    const lines = block.split('\n').filter(l => l.trim());
    const listish = lines.length > 1 && lines.every(l => /^(?:[-*•–]|\d+[.)])\s+/.test(l.trim()));
    if (listish) return <ul key={i}>{lines.map((l, j) => <li key={j}>{cite(l.replace(/^(?:[-*•–]|\d+[.)])\s+/, ''), i + '-' + j)}</li>)}</ul>;
    return <p key={i}>{lines.map((l, j) => <React.Fragment key={j}>{j ? <br/> : null}{cite(l, i + '-' + j)}</React.Fragment>)}</p>;
  })}</div>;
}

function PagePill({citation}) {
  if (!citation.page) return <span className="page-pill">No verified PDF page</span>;
  return <span className="page-pill">{citation.pageSource === 'pyq-ocr' ? 'Paper page' : 'PDF page'} {citation.page}</span>;
}

function SourceCard({citation, target}) {
  const ref = useRef(null);
  useEffect(() => {
    if (target) ref.current?.scrollIntoView({block: 'nearest', behavior: 'smooth'});
  }, [target]);
  // The paper-level viewer has not moved into React yet; it lives in the
  // legacy study app under the same hash contract (#/pyq?sub=..&cls=..&ch=..).
  // Linking there is honest: the link says "past papers", and the page it
  // opens is the real paper browser rather than a dead React route.
  const board = citation.docType === 'pyq' && citation.chapter
    ? '/legacy#/pyq?sub=' + encodeURIComponent(citation.subject || 'science')
      + '&cls=' + (citation.class || 10)
      + (citation.year ? '&y=' + citation.year : '') + '&ch=' + citation.chapter
    : '';
  return <article ref={ref} id={'source-' + citation.n} className={'card source' + (target ? ' target' : '')}>
    <div className="source-head">
      <span className="cite-badge">[{citation.n}]</span>
      <span className={'tag ' + (citation.docType === 'pyq' ? 'cream' : 'grey')}>{citation.docType === 'pyq' ? 'CBSE board question' : 'NCERT textbook'}</span>
      <PagePill citation={citation}/>
    </div>
    <h4>{citation.label || 'Source ' + citation.n}</h4>
    <p className="meta">{[citation.chapter ? 'Ch ' + citation.chapter : '', citation.chapterTitle || ''].filter(Boolean).join(' · ')}</p>
    {citation.question && citation.question !== citation.snippet && <p style={{margin: '0 0 8px', fontSize: 13.6}}>{citation.question}</p>}
    <blockquote className="excerpt">{String(citation.snippet || '').slice(0, 320)}{String(citation.snippet || '').length > 320 ? '…' : ''}</blockquote>
    {citation.verifiedKey && citation.answer ? <div className="key-line"><b>{citation.docType === 'pyq' ? 'Verified answer key' : 'NCERT answer'}</b> {citation.answer}</div> : null}
    {board && <div style={{marginTop: 10, fontSize: 12.6}}><a className="tag grey" href={board}>Board questions in this chapter →</a></div>}
  </article>;
}

function AnswerCard({turn, target}) {
  if (turn.state === 'loading') {
    return <div className="loading-line" role="status"><span className="dots" aria-hidden="true"><span/><span/><span/></span> Searching the textbook and drafting a cited answer…</div>;
  }
  const citations = turn.citations || [];
  if (turn.state === 'error') {
    return <div className="answer">
      <div className="answer-meta"><span className="tag cream">No draft this time</span></div>
      <p className="muted" style={{marginBottom: 10}}>{turn.error}</p>
      {citations.length > 0 && <>
        <p className="muted">The sources below were still found, and are safe to read:</p>
        <div className="sources">{citations.map(c => <SourceCard key={c.n} citation={c} target={target === c.n}/>)}</div>
      </>}
    </div>;
  }
  if (turn.onTopic === false) {
    return <div className="answer" style={{background: 'var(--cream-50)'}} role="status">
      <div className="answer-meta"><span className="tag cream">Outside the syllabus</span></div>
      <div className="answer-text"><p>{turn.answer}</p></div>
      <p className="muted">This question was not sent to the model. Ask about a chapter, a reaction, a formula or a board question.</p>
    </div>;
  }
  if (!turn.grounded) {
    return <div className="answer" style={{background: 'var(--cream-50)'}} role="status">
      <div className="answer-text"><p>{turn.answer}</p></div>
      <p className="muted">No confident source match, so no answer was drafted.</p>
    </div>;
  }
  const check = turn.citationCheck || {};
  /* An answer that came from the book's own key or from the stored bank was
     not drafted by the model, so it must not be labelled as an AI draft. */
  if (turn.keyed || turn.stored) {
    return <div className="answer">
      <div className="answer-meta">
        <span className={'tag ' + (turn.keyed ? 'green' : 'grey')}>{turn.keyed ? 'Book answer key' : 'Stored answer'}</span>
        <span className="tag grey">{citations.length} {citations.length === 1 ? 'source' : 'sources'}</span>
        <span className="muted">{turn.notice}</span>
      </div>
      <div className="answer-text"><p style={{whiteSpace: 'pre-wrap'}}>{turn.answer}</p></div>
      {citations.length > 0 && <>
        <h3 className="sources-title">Sources <span className="muted">verify against the original</span></h3>
        <div className="sources">{citations.map(c => <SourceCard key={c.n} citation={c} target={target === c.n}/>)}</div>
      </>}
    </div>;
  }
  return <div className="answer">
    <div className="answer-meta">
      <span className="tag green">{turn.model || 'local model'}</span>
      <span className="tag grey">{citations.length} {citations.length === 1 ? 'source' : 'sources'}</span>
      {turn.notice && <span className="muted">{turn.notice}</span>}
    </div>
    {check.invalid && check.invalid.length ? <div className="callout warn">The draft cited a number that is not in the source list. Check that sentence against the pages below.</div> : null}
    {!check.hasCitation && citations.length ? <div className="callout warn">The draft does not point to a source with [n]. Read the pages below and check the claim yourself.</div> : null}
    <AnswerText text={turn.answer} count={citations.length}/>
    {citations.length > 0 && <>
      <h3 className="sources-title">Sources <span className="muted">verify against the original</span></h3>
      <div className="sources">{citations.map(c => <SourceCard key={c.n} citation={c} target={target === c.n}/>)}</div>
    </>}
  </div>;
}

export function Chat({scope, setScope, caps, initialQuestion}) {
  const [turns, setTurns] = useState([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState(null);
  const [status, setStatus] = useState(null);
  const threadRef = useRef(null);
  const boxRef = useRef(null);
  const subject = scope?.subject || 'science';
  const cls = caps?.role === 'student' ? (caps.person?.class || scope?.class || 10) : (scope?.class || 10);

  useEffect(() => {
    api.chatStatus().then(setStatus).catch(() => setStatus(null));
  }, []);

  // A shared or practice question is asked once, then the parameter is dropped
  // so a re-render or reload does not ask it again.
  const askedInitial = useRef(false);
  useEffect(() => {
    if (!initialQuestion || askedInitial.current) return;
    askedInitial.current = true;
    history.replaceState(null, '', '#/chat');
    ask(initialQuestion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion]);

  useEffect(() => {
    const onCite = e => {
      const link = e.target.closest?.('a.cite');
      if (!link) return;
      e.preventDefault();
      const n = Number(link.dataset.cite);
      setTarget(n);
      setTimeout(() => setTarget(null), 1600);
    };
    document.addEventListener('click', onCite);
    return () => document.removeEventListener('click', onCite);
  }, []);

  // A click and Enter can arrive within the same tick, before React has
  // re-rendered `busy`; the ref is the guard that actually stops a second
  // request (and a second billed model call) from the same question.
  const asking = useRef(false);
  async function ask(question) {
    const q = String(question || '').replace(/\s+/g, ' ').trim();
    if (!q || busy || asking.current) return;
    asking.current = true;
    const id = 't' + Date.now();
    const prior = turns.filter(t => t.state !== 'loading').slice(-2)
      .flatMap(t => [{role: 'user', content: t.question}, {role: 'assistant', content: t.answer || ''}]);
    setTurns(list => [...list, {id, question: q, state: 'loading'}]);
    setDraft('');
    setBusy(true);
    try {
      const res = await api.askChat({question: q, class: cls, subject, chapter: scope?.chapter || undefined, lang: 'en', history: prior});
      setTurns(list => list.map(t => t.id === id ? {...t, ...res, state: 'done'} : t));
    } catch (e) {
      setTurns(list => list.map(t => t.id === id ? {...t, state: 'error', error: e.message, citations: e.citations || []} : t));
    } finally {
      asking.current = false;
      setBusy(false);
      setTimeout(() => threadRef.current?.scrollTo?.({top: threadRef.current.scrollHeight, behavior: 'smooth'}), 50);
    }
  }

  const starters = STARTERS[subject] || STARTERS.science;

  return <div className="chat-page">
    <section className="page-head">
      <span className="eyebrow"><span className="dot"/>Class {cls} · {subjectLabel(subject)} · evidence-first</span>
      <h2>Ask anything from your {subjectLabel(subject)} course</h2>
      <p>Answers are written by the site’s own model from the NCERT chapters and CBSE papers in this app. Every claim carries a source number; open it to check the chapter, section and PDF page. Questions outside your syllabus are refused.</p>
      <div className="chat-head" style={{marginTop: 14}}>
        <div className="chat-scope">
          {status?.enabled
            ? <span className="tag green">Local model · {status.model}</span>
            : <span className="tag cream">Model offline · sources only</span>}
          <span className="tag grey">{status?.subjects?.[`${cls}:${subject}`]?.chunks ? status.subjects[`${cls}:${subject}`].chunks + ' indexed passages' : 'index loads on first question'}</span>
        </div>
        {turns.length > 0 && <button className="btn btn-ghost btn-sm" type="button" onClick={() => setTurns([])}>Clear chat</button>}
      </div>
    </section>

    <div className="callout tip">
      <b>Grounded answers, not an answer key.</b> Each answer reads only the indexed chapters and board questions, and every claim points to the page it used. It cannot see your earlier chats after you reload, and it will not guess when the book does not cover the question.
    </div>

    <form className="askbox" onSubmit={e => { e.preventDefault(); ask(draft); }}>
      <label htmlFor="chatQuestion" style={{position: 'absolute', left: '-9999px'}}>Type your question</label>
      <textarea id="chatQuestion" ref={boxRef} value={draft} onChange={e => setDraft(e.target.value)} rows={2} maxLength={800}
        placeholder={`e.g. ${starters[0]}`}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); ask(draft); } }}/>
      <div className="askbox-foot">
        <span className="muted">Enter asks · Shift+Enter adds a line</span>
        <span className="grow"/>
        <button className="btn btn-primary" type="submit" disabled={busy || !draft.trim()}>{busy ? 'Drafting…' : 'Ask'}</button>
      </div>
    </form>

    {turns.length === 0 && <section className="starters">
      <h3>Start with one of these</h3>
      <div className="chip-row">{starters.slice(0, 6).map(s => <button key={s} className="chip" type="button" onClick={() => ask(s)}>{s}</button>)}</div>
      <h3 style={{marginTop: 18}}>The kind of new question exams ask</h3>
      <div className="chip-row">{SUGGEST.map(s => <button key={s} className="chip" type="button" onClick={() => ask(s)}>{s}</button>)}</div>
    </section>}

    <div className="thread" ref={threadRef}>
      {turns.map(t => <div key={t.id} className="stack" style={{gap: 10}}>
        <div className="turn-q"><div className="bubble">{t.question}</div></div>
        <AnswerCard turn={t} target={target}/>
      </div>)}
    </div>
  </div>;
}
