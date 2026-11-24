import React, {useEffect, useMemo, useState} from 'react';
import {api} from '../api.js';

const BOARDS = [['cbse', 'CBSE'], ['icse', 'ICSE'], ['state', 'State board'], ['other', 'Other']];

export function Auth({session}) {
  const [mode, setMode] = useState('login');
  const [role, setRole] = useState('student');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [schools, setSchools] = useState([]);
  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '', idNumber: '',
    school: '', schoolCode: '', board: 'cbse', class: 10
  });

  // Signup may offer a school code; that list is public and short (name + code
  // only) so a family can type the code their school gave them.
  useEffect(() => {
    if (mode !== 'signup' || schools.length) return;
    fetch('/api/platform/public/schools').then(r => r.ok ? r.json() : {schools: []}).then(j => setSchools(Array.isArray(j.schools) ? j.schools : [])).catch(() => {});
  }, [mode, schools.length]);

  const set = key => e => setForm({...form, [key]: e.target.value});
  const pickSchool = useMemo(() => schools.find(s => s.code === form.schoolCode), [schools, form.schoolCode]);

  /* The server's own idea of the landing screen, so a link from a teacher's
     message or the owner's handbook cannot send someone to a screen their role
     is not allowed to open. Falls back to the role, never to a guess. */
  function sendHome(me, result) {
    // signIn/signUp return the server's own `home` for this person.
    const hash = (result && result.home) || (me && me.home) || '';
    if (/^#\/(owner|teacher|home|chat)$/.test(hash)) { location.hash = hash; return; }
    location.hash = me.role === 'owner' ? '#/owner' : me.role === 'teacher' ? '#/teacher' : '#/chat';
  }

  async function submit(e) {
    e.preventDefault();
    setError(''); setNotice(''); setBusy(true);
    try {
      if (mode === 'login') {
        const {me, result} = await session.signIn(form.email.trim(), form.password);
        sendHome(me, result);
      } else {
        const {me, result} = await session.signUp({
          role, name: form.name, email: form.email.trim(), password: form.password,
          phone: form.phone, idNumber: role === 'student' ? form.idNumber : '',
          class: Number(form.class), board: form.board,
          schoolCode: form.schoolCode.trim(), school: form.schoolCode ? '' : form.school.trim()
        });
        sendHome(me, result);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.');
    } finally { setBusy(false); }
  }

  return <div className="auth">
    <aside className="auth-side">
      <div className="brand" style={{color: '#fff'}}>
        <span className="brand-mark" style={{background: 'rgba(255,255,255,.14)', color: '#fff'}} aria-hidden="true">उ</span>
        <span className="brand-name">Kritin उpaay<span style={{color: '#e9c8c4'}}>study with sources</span></span>
      </div>
      <div>
        <div className="eyebrow" style={{color: '#ffd9d4'}}><span className="dot" style={{background: '#ff8d98'}}/>One login · every role</div>
        <h1>A tutor that reads your book, and a school that can see how you are doing.</h1>
        <p>Students ask questions from their own class and board. Teachers set what is in the course. Schools control their own people. The master admin controls the platform.</p>
        <ul>
          <li>Answers cite the NCERT chapter, section and page.</li>
          <li>Every account belongs to one school and one class.</li>
          <li>Off-syllabus questions are refused before the model runs.</li>
        </ul>
      </div>
      <p style={{fontSize: 12, color: '#dcb8b4'}}>Your answers are drafted by the site’s own model. They are study drafts, not official board answer keys.</p>
    </aside>
    <div className="auth-form">
      <form className="auth-box" onSubmit={submit}>
        <div className="seg" role="group" aria-label="Sign in or create an account">
          <button type="button" aria-pressed={mode === 'login'} onClick={() => { setMode('login'); setError(''); }}>Sign in</button>
          <button type="button" aria-pressed={mode === 'signup'} onClick={() => { setMode('signup'); setError(''); }}>Create account</button>
        </div>
        <h2>{mode === 'login' ? 'Welcome back' : 'Join your school'}</h2>
        <div className="sub">{mode === 'login'
          ? 'One page for students, teachers and the master administrator.'
          : 'Choose who you are. A student joins with their school code; a teacher can create the school.'}</div>

        {error && <div className="callout bad" role="alert">{error}</div>}
        {notice && <div className="callout good" role="status">{notice}</div>}

        {mode === 'signup' && <div className="seg" role="group" aria-label="Who is signing up">
          <button type="button" aria-pressed={role === 'student'} onClick={() => setRole('student')}>I am a student</button>
          <button type="button" aria-pressed={role === 'teacher'} onClick={() => setRole('teacher')}>I am a teacher</button>
        </div>}

        <div className="stack">
          {mode === 'signup' && <label className="field"><span>Full name</span>
            <input value={form.name} onChange={set('name')} required minLength={2} autoComplete="name" placeholder="As on your school record"/></label>}

          <label className="field"><span>Email</span>
            <input type="email" value={form.email} onChange={set('email')} required autoComplete="email" placeholder="you@example.com"/></label>

          <label className="field"><span>Password</span>
            <input type="password" value={form.password} onChange={set('password')} required minLength={mode === 'signup' ? 8 : undefined}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder={mode === 'signup' ? 'At least 8 characters, one letter and one number' : ''}/></label>

          {mode === 'signup' && <div className="form-grid">
            <label className="field"><span>Phone number</span>
              <input value={form.phone} onChange={set('phone')} inputMode="tel" autoComplete="tel" placeholder="10-digit mobile"/></label>
            {role === 'student' && <label className="field"><span>ID number (Aadhaar)</span>
              <input value={form.idNumber} onChange={set('idNumber')} inputMode="numeric" placeholder="Optional · digits only"/>
              <small>Stored only as a keyed hash and last four digits.</small></label>}
            <label className="field"><span>Board</span>
              <select value={form.board} onChange={set('board')}>{BOARDS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
            <label className="field"><span>Class</span>
              <select value={form.class} onChange={set('class')}>{[8, 9, 10, 11, 12].map(c => <option key={c} value={c}>Class {c}</option>)}</select></label>
            <label className="field wide"><span>School code</span>
              <input value={form.schoolCode} onChange={set('schoolCode')} placeholder="e.g. green-valley-8f2k" autoCapitalize="none"/>
              <small>{pickSchool ? 'Joining: ' + pickSchool.name : schools.length ? 'Ask your school for its code, or leave it empty and type the school name below.' : 'Leave empty to enter a new school name below.'}</small></label>
            {!form.schoolCode && <label className="field wide"><span>School name (new school)</span>
              <input value={form.school} onChange={set('school')} placeholder="Your school’s full name"/>
              <small>A new school is created and the master admin can rename or suspend it.</small></label>}
          </div>}

          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : role === 'teacher' ? 'Create teacher account' : 'Create student account'}
          </button>
        </div>

        <p className="auth-note">
          {mode === 'login'
            ? 'Teachers and the master admin sign in here too. The site opens the right screens from your account role.'
            : role === 'teacher'
              ? 'A new teacher starts with one teaching pair (Class 10 Science); add your own classes and subjects in My classes.'
              : 'After signup, ask your teacher to add you to a class so your work appears in the class ranking.'}
        </p>
      </form>
    </div>
  </div>;
}
