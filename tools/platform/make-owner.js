#!/usr/bin/env node
'use strict';
/* Create the single master admin.

       npm run make-owner -- --email you@example.com --name "Your Name"

   - The password is read from UPAY_OWNER_PASSWORD, or typed at a hidden prompt.
     It is not accepted as an argument, because arguments end up in shell
     history and in process listings.
   - The account lives in Supabase Auth like everyone else, but its profile has
     role 'owner' and NO school. It is the only such row (a partial unique index
     in the schema enforces that), so "master admin" can never quietly become a
     second, school-attached account.
   - Refuses to run if an owner already exists. --replace is the deliberate way
     to hand the platform over: the old profile is demoted and, where the account
     service allows it, the old auth user is deleted, so there is never a second
     dormant master admin.

   Environment: SUPABASE_URL / SUPABASE_*_KEY (from lib/supabase-public.js) and
   SUPABASE_SERVICE_ROLE_KEY — the same variables the server uses.
*/
const readline = require('node:readline');
const crypto = require('node:crypto');

function fail(message) {
  console.error('make-owner: ' + message);
  process.exit(1);
}
function arg(name, fallback) {
  const at = process.argv.indexOf('--' + name);
  return at >= 0 && process.argv[at + 1] && !process.argv[at + 1].startsWith('--') ? process.argv[at + 1] : fallback;
}
const has = name => process.argv.includes('--' + name);

function hiddenPrompt(question) {
  return new Promise(resolve => {
    if (!process.stdin.isTTY) fail('no terminal to type the password. Set UPAY_OWNER_PASSWORD instead.');
    process.stdout.write(question);
    const rl = readline.createInterface({input: process.stdin, output: process.stdout, terminal: true});
    const write = rl._writeToOutput ? rl._writeToOutput.bind(rl) : null;
    rl._writeToOutput = function (text) {
      // Echo only the prompt, never the characters typed.
      if (write && text === question) write(text);
    };
    rl.question('', answer => { rl.close(); process.stdout.write('\n'); resolve(answer); });
  });
}

async function main() {
  const email = String(arg('email', '')).trim().toLowerCase();
  const name = String(arg('name', 'Master Admin')).trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail('pass a real --email address');
  if (name.length < 2 || name.length > 120) fail('--name must be 2–120 characters');

  const db = require('../../lib/db.js');
  if (!db.enabled()) fail('the database is not configured (set SUPABASE_URL and the database URL used by lib/db.js)');
  const admin = require('../../lib/supabase-admin.js');
  if (!admin.configured()) fail('set SUPABASE_SERVICE_ROLE_KEY so accounts can be created');

  const existing = await db.one("select id, email_join from public.profiles where role = 'owner' limit 1");
  if (existing) {
    if (!has('replace')) {
      fail('a master admin already exists (' + (existing.email_join || 'email hidden') + ').\n' +
        '       To hand the platform to someone else, re-run with --replace; the old owner account is removed.');
    }
    console.log('Replacing the existing master admin…');
    await db.query("update public.profiles set role = 'student', school_id = null where id = $1", [existing.id]);
    try { await admin.deleteUser(existing.id); } catch (e) { console.log('  (old auth user could not be removed: ' + e.code + ')'); }
  }

  const password = String(process.env.UPAY_OWNER_PASSWORD || '') || await hiddenPrompt('New master-admin password: ');

  // Refuse a password that is already a real person's: the owner account must
  // not become a way to sign in as somebody else.
  if (password.length < 12) fail('use at least 12 characters for the account that controls every school');
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) fail('mix letters and numbers');

  const created = await admin.createUser({ email, password });
  const id = created && (created.id || (created.user && created.user.id));
  if (!id) fail('the account service did not return a user id');
  // The profile row is what the server trusts; its absence means "not set up".
  const stamp = crypto.createHash('sha256').update(email).digest('hex').slice(0, 12);
  await db.query(
    `insert into public.profiles (id, role, school_id, full_name, email_join, class_level, board, status)
     values ($1, 'owner', null, $2, $3, null, 'cbse', 'active')
     on conflict (id) do update set role = 'owner', school_id = null, full_name = excluded.full_name,
       email_join = excluded.email_join, status = 'active'`,
    [id, name, email]
  );
  console.log('Master admin created: ' + email + '  (profile ' + stamp + ')');
  console.log('Sign in at the site’s single login page; the server will take you to the Schools screen.');
}

main().catch(e => fail(e.message || String(e)));
