import React, {useEffect, useMemo, useState} from 'react';
import {useSession} from './useSession.js';
import {navFor, scopeLabel, ROLES} from './roles.js';
import {Auth} from './pages/Auth.jsx';
import {Chat} from './pages/Chat.jsx';
import {StudentHome} from './pages/StudentHome.jsx';
import {Practice} from './pages/Practice.jsx';
import {Teacher} from './pages/Teacher.jsx';
import {Owner} from './pages/Owner.jsx';
import {ContentControl} from './pages/ContentControl.jsx';
import {About} from './pages/About.jsx';

const TITLES = {
  chat: 'Study chat', home: 'My work', practice: 'Practice', teacher: 'My classes',
  owner: 'Schools', content: 'Content control', about: 'About this site'
};

/* A link can carry a question: #/chat?q=... fills the chat box and asks once. */
function questionFromHash() {
  const query = (location.hash.split('?')[1] || '');
  if (!query) return '';
  const params = new URLSearchParams(query);
  return (params.get('q') || '').slice(0, 800);
}

function route() {
  const name = (location.hash || '#/chat').replace(/^#\/?/, '').split('?')[0] || 'chat';
  return TITLES[name] ? name : 'chat';
}

const ICONS = {
  chat: 'M4 5h16v11H8l-4 4z', home: 'M4 11 12 4l8 7v9h-6v-6h-4v6H4z', book: 'M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z',
  users: 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm8 0a2.5 2.5 0 1 0 0-5', building: 'M4 20V6l8-3v17M12 20h8V10l-8-4',
  sliders: 'M4 8h10M18 8h2M4 16h4M12 16h8M14 5v6M8 13v6', info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 8v.5M12 11v5'
};

function Icon({name}) {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICONS[name] || ICONS.chat}/></svg>;
}

export default function App() {
  const session = useSession();
  const [name, setName] = useState(route());
  const [scope, setScope] = useState(null);

  useEffect(() => {
    const onHash = () => setName(route());
    window.addEventListener('hashchange', onHash);
    if (!location.hash) location.replace('#/chat');
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const caps = session.caps;
  // The default scope comes from the person's own account, not from the URL.
  useEffect(() => {
    if (!caps) { setScope(null); return; }
    setScope(prev => {
      if (prev) return prev;
      const base = caps.scope || {};
      return {class: base.class || caps.person?.class || 10, subject: base.subject || 'science'};
    });
  }, [caps]);

  const nav = useMemo(() => navFor(caps), [caps]);
  const allowed = useMemo(() => new Set(nav.map(n => n.to.replace('/', ''))), [nav]);
  const current = allowed.has(name) ? name : (caps ? (caps.role === 'teacher' ? 'teacher' : caps.role === 'owner' ? 'owner' : 'chat') : 'about');

  if (session.status === 'loading' && !session.person) {
    return <div className="auth"><div className="auth-side"><div className="brand"><span className="brand-mark">उ</span><span className="brand-name">Kritin Upaay<span>study with sources</span></span></div></div><div className="auth-form"><div className="loading">Checking your session…</div></div></div>;
  }
  if (session.status === 'guest' || !caps) {
    return <Auth session={session} />;
  }

  function go(to) { location.hash = '#' + to; }

  function page() {
    const scopeProps = {scope, setScope, caps};
    if (current === 'chat') return <Chat {...scopeProps} initialQuestion={questionFromHash()} />;
    if (current === 'home') return <StudentHome caps={caps} scope={scope} setScope={setScope} />;
    if (current === 'practice') return <Practice caps={caps} scope={scope} />;
    if (current === 'teacher') return <Teacher caps={caps} scope={scope} setScope={setScope} />;
    if (current === 'owner') return <Owner caps={caps} />;
    if (current === 'content') return <ContentControl caps={caps} scope={scope} setScope={setScope} />;
    return <About caps={caps} />;
  }

  const scopeChoices = caps.subjects ? caps.subjects.filter(s => s.class === 10 || s.class === 12) : [];
  const canPickScope = caps.role !== 'student';

  return <div className="shell">
    <aside className="rail">
      <a className="brand" href="#/chat" aria-label="Kritin Upaay home">
        <span className="brand-mark" aria-hidden="true">उ</span>
        <span className="brand-name">Kritin Upaay<span>study with sources</span></span>
      </a>
      <nav className="nav" aria-label="Sections">
        <span className="nav-label">{ROLES[caps.role]?.label || 'Sections'}</span>
        {nav.map(item => <a key={item.to} href={'#' + item.to} aria-current={item.to === '/' + current ? 'page' : undefined}><Icon name={item.icon}/> {item.label}</a>)}
      </nav>
      {canPickScope && <div className="scope-pick">
        <span className="nav-label">Working on</span>
        <label>Class
          <select value={scope?.class || 10} onChange={e => setScope({...scope, class: Number(e.target.value)})}>
            {[8, 9, 10, 11, 12].map(c => <option key={c} value={c}>Class {c}</option>)}
          </select>
        </label>
        <label>Subject
          <select value={scope?.subject || 'science'} onChange={e => setScope({...scope, subject: e.target.value})}>
            {scopeChoices.filter(s => s.class === (scope?.class || 10)).map(s => <option key={s.subject} value={s.subject}>{s.title}</option>)}
            {!scopeChoices.some(s => s.class === (scope?.class || 10)) && <option value="science">Science</option>}
          </select>
        </label>
      </div>}
      <div className="rail-foot">
        <div className="who">
          <strong>{caps.person?.name || 'Signed in'}</strong>
          {caps.person?.school || 'No school yet'}<br/>
          {scopeLabel(caps.scope)}<br/>
          <span style={{color: 'var(--ink-3)'}}>{caps.person?.email}</span>
        </div>
        <button className="btn btn-ghost btn-sm" type="button" onClick={async () => { await session.signOut(); go('/chat'); }}>Sign out</button>
      </div>
    </aside>
    <div className="main">
      <header className="topbar">
        <div>
          <div className="crumb">{caps.person?.school || (caps.role === 'owner' ? 'Platform' : 'No school')} · {ROLES[caps.role]?.label}</div>
          <h1>{TITLES[current]}</h1>
        </div>
        <div className="row" style={{gap: 8}}>
          <span className="tag grey">{scopeLabel(caps.scope)}</span>
          <a className="btn btn-primary btn-sm" href="#/chat">Ask a question</a>
        </div>
      </header>
      <main className="page">{page()}</main>
    </div>
  </div>;
}
