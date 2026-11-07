/* seed-admin.js — create data/db.json with a chosen admin password
   usage:  node tools/seed-admin.js 'YourStrongPassword'   (from the upay/ folder)
   The password is hashed; nothing is written in clear text.  */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const pw = process.argv[2];
if (!pw || pw.length < 8) {
  console.error('Give a password of at least 8 characters: node tools/seed-admin.js "..."');
  process.exit(1);
}
const DIR = path.join(__dirname, '..', 'data');
fs.mkdirSync(DIR, { recursive: true, mode: 0o700 });
// Never replace an existing installation or its user data.
if (fs.existsSync(path.join(DIR, 'db.json'))) {
  console.error('An existing database was found. Refusing to overwrite it; use the account page or reset-admin.js.');
  process.exit(1);
}

const keyFile = path.join(DIR, 'secret.key');
if (!fs.existsSync(keyFile)) fs.writeFileSync(keyFile, crypto.randomBytes(32).toString('hex'), { mode: 0o600 });

const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.pbkdf2Sync(pw, salt, 120000, 32, 'sha256').toString('hex');

const db = {
  version: 1,
  createdAt: new Date().toISOString(),
  settings: { geminiKeySealed: null, signupOpen: false, signupCode: '', geminiModel: 'gemini-3.5-flash-lite', siteTitle: 'Upay · उपाय' },
  users: [{
    id: 'u_admin', user: 'admin', role: 'admin', name: 'Administrator',
    salt: salt, hash: hash, mustChange: false, createdAt: new Date().toISOString()
  }],
  content: { books: [], papers: [], notes: [] },
  aiLog: [],
  audit: []
};
fs.writeFileSync(path.join(DIR, 'db.json'), JSON.stringify(db, null, 2), { flag: 'wx', mode: 0o600 });
console.log('admin account ready · user "admin" · password as supplied · data/ created');
