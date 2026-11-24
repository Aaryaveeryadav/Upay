import React from 'react';
import {ROLES} from '../roles.js';

/* What this site is, in the site's own words. This is also where the product
   policies that must never be hidden live: no board-verified claims, no cloud
   model, what happens to a student's data. */
export function About({caps}) {
  return <div className="stack">
    <section className="page-head">
      <span className="eyebrow"><span className="dot"/>About</span>
      <h2>Study with sources, not guesses</h2>
      <p>Kritin Upaay is a school study app for CBSE and ICSE classes. It answers from the textbooks and board papers in the app, shows the exact page it read, and refuses questions that are not part of your course.</p>
    </section>

    <div className="grid grid-2">
      <section className="card">
        <h3>The model is yours</h3>
        <p>Answers are written by a model running on this school’s own server (a local GPU with the Ollama engine). No question, answer or account detail is sent to a cloud AI provider. When the model is not running, the site still shows the sources it found rather than inventing an answer.</p>
      </section>
      <section className="card">
        <h3>Not an official answer key</h3>
        <p>Every answer is a study draft. Verified NCERT keys and board questions are labelled as such on each source card; nothing else claims to be board-verified. Always check the cited page before you rely on an answer in an exam.</p>
      </section>
      <section className="card">
        <h3>Your account and your school</h3>
        <p>One login works for students, teachers and the master administrator. Your role, school and class come from your profile on the server; you can never see another school’s data or another student’s work. A school whose access is paused cannot sign in or ask questions.</p>
      </section>
      <section className="card">
        <h3>What is stored</h3>
        <p>Your name, email, phone, class, board and school. A student’s ID number is stored only as a keyed hash and its last four digits. Answers you record are visible to you and your teachers at your school. The master administrator manages schools and content, not your answers.</p>
      </section>
    </div>

    <section className="card">
      <h3>Who sees what</h3>
      <table className="table">
        <thead><tr><th>Role</th><th>Can do</th></tr></thead>
        <tbody>
          <tr><td>{ROLES.student.label}</td><td>Ask questions in their own class and board, practise, see their own record. Cannot change content or see other students.</td></tr>
          <tr><td>{ROLES.teacher.label}</td><td>Manage the classes and subjects they teach: add students, rank the class, mark topics as important or removed, record marks.</td></tr>
          <tr><td>{ROLES.owner.label}</td><td>Create and suspend schools, publish or remove chapters for everyone, see platform activity. Does not need or see a student’s answers.</td></tr>
        </tbody>
      </table>
    </section>

    <section className="card">
      <h3>You are signed in as</h3>
      <p>{caps.person?.name} · {ROLES[caps.role]?.label} · {caps.person?.school || 'no school'} · {caps.person?.email}</p>
    </section>
  </div>;
}
