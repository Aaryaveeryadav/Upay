#!/usr/bin/env node
'use strict';
/* Apply the SQL in supabase/migrations/ to the database named by DATABASE_URL.

   The Supabase dashboard's SQL editor can run the same files by hand; this
   script exists so a fresh self-hosted server can be set up with one command:

       DATABASE_URL=postgres://... npm run migrate

   It records what it applied in public.schema_migrations, so running it twice
   does not re-run a migration (the files are also written to be re-runnable).
   Nothing here contains a credential; the connection string comes from the
   environment and is never printed.
*/
const fs = require('node:fs');
const path = require('node:path');

function fail(message) {
  console.error('migrate: ' + message);
  process.exit(1);
}

async function main() {
  const url = String(process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || '').trim();
  if (!url) {
    fail('set DATABASE_URL (Supabase: Project settings → Database → Connection string).\n' +
      '       The migration files can also be pasted into the Supabase SQL editor in order.');
  }
  let pg;
  try { pg = require('pg'); } catch (_) { fail('the pg package is missing: run npm install'); }

  const dir = path.join(__dirname, '..', '..', 'supabase', 'migrations');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  if (!files.length) fail('no .sql files found in supabase/migrations');

  const client = new pg.Client({ connectionString: url, ssl: /supabase|amazonaws|render|railway|neon/i.test(url) ? { rejectUnauthorized: false } : undefined });
  await client.connect();
  try {
    await client.query(`create table if not exists public.schema_migrations (
      name text primary key, applied_at timestamptz not null default now())`);
    const done = new Set((await client.query('select name from public.schema_migrations')).rows.map(r => r.name));
    let applied = 0;
    for (const file of files) {
      if (done.has(file)) { console.log('  = ' + file + ' (already applied)'); continue; }
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      process.stdout.write('  + ' + file + ' ... ');
      await client.query('begin');
      try {
        await client.query(sql);
        await client.query('insert into public.schema_migrations (name) values ($1)', [file]);
        await client.query('commit');
        applied++;
        console.log('done');
      } catch (e) {
        await client.query('rollback');
        // Say WHICH migration failed and the database's message, never the URL.
        throw new Error(file + ': ' + (e.message || e));
      }
    }
    console.log(applied ? `Applied ${applied} migration(s).` : 'Database is up to date.');
    console.log('Next: create the master admin with  npm run make-owner -- --email you@example.com');
  } finally {
    await client.end();
  }
}

main().catch(e => fail(e.message || String(e)));
