import React, {useState} from 'react';

/* Sign-in only. Account creation happens on the legacy site at /#/login,
   which is backed by Supabase (email + Google) and works on the hosted
   deployment. The signup that used to live here called /api/platform/signup,
   which needs a Postgres service-role database this deployment does not have,
   so it always answered "No API route at /api/platform/signup". Keeping one
   account system is the whole point: one site, one login, no second version. */
export function Auth({session}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ email: '', password: '' });

  const set = key => e => setForm({...form, [key]: e.target.value});

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
    setError(''); setBusy(true);
    try {
      const {me, result} = await session.signIn(form.email.trim(), form.password);
      sendHome(me, result);
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.');
    } finally { setBusy(false); }
  }

  return <div className="auth">
    <aside className="auth-side">
      <div className="brand" style={{color: '#fff'}}>
        <span className="brand-mark" style={{background: 'rgba(255,255,255,.14)', color: '#fff'}} aria-hidden="true">उ</span>
        <span className="brand-name">Kritin Upaay<span style={{color: '#e9c8c4'}}>study with sources</span></span>
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
        {/* One site, one account system. Accounts live on the legacy site at
            / (Supabase email + Google), which is the only place they can be
            created: this panel's /api/platform/signup needs a Postgres
            service-role database that the hosted deployment does not have, so
            offering "Create account" here produced "No API route at
            /api/platform/signup". Rather than keep a second, dead signup, this
            panel points at the real one. */}
        <h2>Welcome back</h2>
        <div className="sub">One page for students, teachers and the master administrator.</div>

        {error && <div className="callout bad" role="alert">{error}</div>}

        <div className="stack">
          <label className="field"><span>Email</span>
            <input type="email" value={form.email} onChange={set('email')} required autoComplete="email" placeholder="you@example.com"/></label>

          <label className="field"><span>Password</span>
            <input type="password" value={form.password} onChange={set('password')} required
              autoComplete="current-password" placeholder=""/></label>

          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Please wait…' : 'Sign in'}
          </button>
        </div>

        <p className="auth-note">
          Teachers and the master admin sign in here too. The site opens the right screens from your account role.
        </p>

        {/* Account creation is the legacy site's job (Supabase email + Google),
            the same account that signs in here. A second signup form here could
            never succeed, so it links to the one that does. */}
        <p className="auth-note" style={{borderTop: '1px solid rgba(0,0,0,.08)', paddingTop: 12, marginTop: 12}}>
          New here? <a href="/#/login?mode=signup" className="link"><b>Create your account</b></a> — it works with
          your school email or a Google account, and signs you in to this same site.
        </p>
      </form>
    </div>
  </div>;
}
