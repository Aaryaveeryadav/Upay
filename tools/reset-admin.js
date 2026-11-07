/* Reset the local admin password without removing user data.
   Stop the server first: it holds db.json in memory. Prefer the account page
   when you can sign in. For recovery, supply UPAY_ADMIN_PASSWORD as an
   environment variable; a legacy command-line argument is also accepted but
   may be visible in shell history and process listings. */
'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const pw = process.env.UPAY_ADMIN_PASSWORD || process.argv[2];
if (!pw || pw.length < 8) {
  console.error('Set UPAY_ADMIN_PASSWORD to a password of at least 8 characters, then run node tools/reset-admin.js. Stop the server first.');
  process.exit(1);
}
const FILE = path.join(__dirname, '..', 'data', 'db.json');
if (!fs.existsSync(FILE)) {
  console.error('No data/db.json exists yet. Start the server to create a fresh installation.');
  process.exit(1);
}
const raw = fs.readFileSync(FILE, 'utf8');
const db = JSON.parse(raw);
db.users = db.users || [];
let admin = db.users.find(u => u.user === 'admin');
if (!admin) {
  admin = { id: 'u_admin', user: 'admin', role: 'admin', name: 'Administrator', createdAt: new Date().toISOString() };
  db.users.push(admin);
}
const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.pbkdf2Sync(pw, salt, 120000, 32, 'sha256').toString('hex');
// An exclusive timestamped backup avoids silently overwriting older backups.
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backup = path.join(path.dirname(FILE), 'db.before-reset-' + stamp + '-' + crypto.randomBytes(3).toString('hex') + '.json');
fs.writeFileSync(backup, raw, { flag: 'wx', mode: 0o600 });
admin.salt = salt;
admin.hash = hash;
admin.mustChange = false;
admin.authVersion = Number(admin.authVersion || 0) + 1; // invalidate old signed sessions
const tmp = FILE + '.reset-' + crypto.randomBytes(4).toString('hex');
const fd = fs.openSync(tmp, 'wx', 0o600);
try { fs.writeFileSync(fd, JSON.stringify(db)); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
fs.renameSync(tmp, FILE);
console.log('Local admin password changed; existing local sessions for this account are invalid.');
console.log('A private, timestamped recovery backup was written inside data/.');
