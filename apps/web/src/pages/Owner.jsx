import React, {useEffect, useState} from 'react';
import {api} from '../api.js';

/* Master admin: every school, its status, and the switch that stops a school's
   access without deleting anything. The owner is a person with role 'owner';
   there is no separate admin URL and no special header. */
export function Owner({caps}) {
  const [schools, setSchools] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const [summary, setSummary] = useState(null);
  const [form, setForm] = useState({name: '', code: '', city: '', board: 'cbse', plan: 'trial'});

  const load = () => api.schools().then(d => { setSchools(d.schools || []); setError(''); }).catch(e => setError(e.message));
  useEffect(() => { load(); }, []);

  async function setStatus(school, status) {
    setBusy(school.id); setError(''); setNotice('');
    try {
      await api.updateSchool(school.id, {status});
      setNotice(`${school.name} is now ${status}.`);
      await load();
    } catch (e) { setError(e.message); }
    finally { setBusy(''); }
  }

  async function create(e) {
    e.preventDefault();
    setError(''); setNotice('');
    try {
      await api.createSchool(form);
      setNotice('School created. Share its code with the school.');
      setForm({name: '', code: '', city: '', board: 'cbse', plan: 'trial'});
      await load();
    } catch (err) { setError(err.message); }
  }

  async function importTopics() {
    setBusy('import'); setError(''); setNotice('');
    try {
      const result = await api.importContent();
      setNotice(`Content list refreshed: ${result.inserted} new, ${result.updated} updated.`);
    } catch (e) { setError(e.message); }
    finally { setBusy(''); }
  }

  return <div className="stack">
    <section className="page-head">
      <span className="eyebrow"><span className="dot"/>Master admin</span>
      <h2>The whole platform, one place</h2>
      <p>Every school, its people and its access. Suspending a school stops its students and teachers at the login and on every request, without deleting a single record. You are signed in as {caps.person?.name} ({caps.person?.email}).</p>
    </section>
    {error && <div className="callout bad" role="alert">{error}</div>}
    {notice && <div className="callout good" role="status">{notice}</div>}

    <section className="card">
      <h3>Create a school</h3>
      <form className="form-grid" onSubmit={create}>
        <label className="field"><span>School name</span><input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Green Valley Public School"/></label>
        <label className="field"><span>School code</span><input required value={form.code} onChange={e => setForm({...form, code: e.target.value.toLowerCase()})} placeholder="green-valley" pattern="[a-z0-9][a-z0-9-]{1,40}"/>
          <small>Students type this at signup to join.</small></label>
        <label className="field"><span>City</span><input value={form.city} onChange={e => setForm({...form, city: e.target.value})}/></label>
        <label className="field"><span>Board</span><select value={form.board} onChange={e => setForm({...form, board: e.target.value})}><option value="cbse">CBSE</option><option value="icse">ICSE</option><option value="state">State</option><option value="other">Other</option></select></label>
        <label className="field"><span>Plan</span><select value={form.plan} onChange={e => setForm({...form, plan: e.target.value})}><option value="trial">Trial</option><option value="standard">Standard</option><option value="custom">Custom</option></select></label>
        <div className="wide"><button className="btn btn-primary" type="submit">Create school</button></div>
      </form>
    </section>

    <section>
      <div className="section-title"><h3>Schools</h3>
        <button className="btn btn-sm" type="button" disabled={busy === 'import'} onClick={importTopics}>{busy === 'import' ? 'Importing…' : 'Refresh content list from app data'}</button>
      </div>
      {!schools ? <div className="loading">Loading schools…</div> : schools.length === 0 ? <div className="empty">No schools yet.</div> : <table className="table">
        <thead><tr><th>School</th><th>Code</th><th>Plan</th><th>Status</th><th>Access</th></tr></thead>
        <tbody>{schools.map(s => <tr key={s.id}>
          <td><b>{s.name}</b><div className="muted">{s.city}</div></td>
          <td><code>{s.code}</code></td>
          <td>{s.plan}{s.paid_until ? <div className="muted">paid to {s.paid_until}</div> : null}</td>
          <td><span className={'tag ' + (s.status === 'active' ? 'green' : 'cream')}>{s.status}</span></td>
          <td><div className="row" style={{gap: 6}}>
            {s.status === 'active'
              ? <button className="btn btn-sm btn-danger" disabled={busy === s.id} onClick={() => setStatus(s, 'suspended')}>Stop access</button>
              : <button className="btn btn-sm" disabled={busy === s.id} onClick={() => setStatus(s, 'active')}>Restore access</button>}
            <button className="btn btn-sm" onClick={() => api.schoolSummary(s.id).then(setSummary).catch(e => setError(e.message))}>Details</button>
          </div></td>
        </tr>)}</tbody>
      </table>}
    </section>

    {summary && <section className="card">
      <div className="row"><h3>{summary.school.name} — last 30 days</h3><button className="btn btn-sm" onClick={() => setSummary(null)}>Close</button></div>
      <div className="grid grid-3" style={{margin: '12px 0'}}>
        <div className="stat"><strong>{summary.counts.students}</strong><span>students</span></div>
        <div className="stat"><strong>{summary.counts.teachers}</strong><span>teachers</span></div>
        <div className="stat"><strong>{summary.activity.reduce((a, r) => a + Number(r.events), 0)}</strong><span>answers in 30 days</span></div>
      </div>
      {summary.overrides.length > 0 && <><h3 style={{marginBottom: 8}}>School content choices</h3>
        <table className="table"><thead><tr><th>Topic</th><th>Visible</th><th>Exam priority</th></tr></thead>
          <tbody>{summary.overrides.map(o => <tr key={o.topic_id}><td>{o.title}</td><td>{o.visible ? 'Yes' : 'Hidden'}</td><td>{o.exam_weight}/5</td></tr>)}</tbody></table></>}
    </section>}
  </div>;
}
