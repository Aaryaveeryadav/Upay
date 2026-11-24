-- Upay multi-tenant platform: schools, people, roles, content access and study records.
--
-- Design notes
--   * One login page for everybody. A person's role is resolved on the server
--     from their profile row, never from metadata the browser can edit.
--   * Three roles: 'owner' (the single master admin, isolated from school data),
--     'teacher' and 'student'. A teacher may teach many (class, subject) pairs.
--   * Schools can be suspended. A suspended school locks out every student and
--     teacher attached to it without deleting their data.
--   * Content visibility is per school and per (class, subject): the master admin
--     controls the platform, the school admin controls what its teachers and
--     students may see. Nothing here trusts a client-supplied school or role.
--
-- All statements are written to be safely re-runnable where SQL allows it.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- schools ----
create table if not exists public.schools (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 2 and 160),
  code         text not null unique check (code ~ '^[a-z0-9][a-z0-9-]{1,40}$'),
  board        text not null default 'cbse' check (board in ('cbse','icse','state','other')),
  city         text not null default '',
  phone        text not null default '',
  status       text not null default 'active' check (status in ('active','suspended','archived')),
  -- Billing is intentionally coarse: the master admin flips 'active' to
  -- 'suspended' when a school stops paying; no card data is stored here.
  plan         text not null default 'standard' check (plan in ('trial','standard','custom')),
  paid_until   date,
  note         text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- --------------------------------------------------------------- profiles ----
-- One row per Supabase Auth user. Created by the server after signup, using the
-- service-role key; a browser can never write its own role or school.
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  role         text not null default 'student' check (role in ('owner','teacher','student')),
  school_id    uuid references public.schools(id) on delete set null,
  full_name    text not null check (char_length(full_name) between 2 and 120),
  -- Lower-cased email kept for teacher "add student by email" lookups; the
  -- auth.users row is the authority for the address itself.
  email_join   text not null default '',
  phone        text not null default '' check (phone = '' or phone ~ '^[0-9+() -]{6,20}$'),
  -- Identity number (Aadhaar for students where the school collects it). Stored
  -- as a keyed hash plus last four digits: the full number is never readable in
  -- a database dump and is never returned to the site.
  id_hash      text not null default '',
  id_last4     text not null default '',
  -- The student's own class/board selection, used to scope the site.
  class_level  smallint check (class_level between 8 and 12),
  board        text not null default 'cbse' check (board in ('cbse','icse','state','other')),
  lang         text not null default 'en' check (lang in ('en','hi')),
  status       text not null default 'active' check (status in ('active','suspended','invited')),
  must_change  boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists profiles_school_role on public.profiles (school_id, role);
create index if not exists profiles_class on public.profiles (school_id, class_level);

-- Exactly one master admin. Enforced by a partial unique index.
create unique index if not exists profiles_single_owner on public.profiles ((role)) where role = 'owner';

-- ------------------------------------------------------- teaching scope ----
-- A teacher teaches one or more (class, subject) pairs, possibly at more than
-- one school. Students are grouped by class and section.
create table if not exists public.teaching (
  id           uuid primary key default gen_random_uuid(),
  teacher_id   uuid not null references public.profiles(id) on delete cascade,
  school_id    uuid not null references public.schools(id) on delete cascade,
  class_level  smallint not null check (class_level between 8 and 12),
  subject      text not null check (subject ~ '^[a-z0-9-]{2,30}$'),
  created_at   timestamptz not null default now(),
  unique (teacher_id, school_id, class_level, subject)
);

create table if not exists public.class_groups (
  id           uuid primary key default gen_random_uuid(),
  school_id    uuid not null references public.schools(id) on delete cascade,
  class_level  smallint not null check (class_level between 8 and 12),
  section      text not null default 'A' check (section ~ '^[A-Z0-9]{1,4}$'),
  teacher_id   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  unique (school_id, class_level, section)
);

create table if not exists public.enrolments (
  student_id   uuid not null references public.profiles(id) on delete cascade,
  group_id     uuid not null references public.class_groups(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (student_id, group_id)
);

-- ------------------------------------------------------- content control ----
-- Master list of chapters/topics the platform can serve, mirroring the app's
-- data. `published` is the platform-wide switch (master admin). A school can
-- further hide or deprioritise rows through school_content.
create table if not exists public.content_topics (
  id            text primary key,                    -- e.g. sci10-ch-1, sci10-ch-1-sec-1-3
  class_level   smallint not null check (class_level between 8 and 12),
  subject       text not null check (subject ~ '^[a-z0-9-]{2,30}$'),
  chapter_no    smallint,
  kind          text not null default 'chapter' check (kind in ('chapter','section','topic','formula','pyq-set')),
  parent_id     text,
  title         text not null check (char_length(title) between 1 and 200),
  title_hi      text not null default '',
  published     boolean not null default true,
  removed_reason text not null default '',
  updated_by    uuid references public.profiles(id) on delete set null,
  updated_at    timestamptz not null default now()
);
create index if not exists content_topics_scope on public.content_topics (class_level, subject, chapter_no);

-- Per-school overrides. Absent row = follow the platform default.
create table if not exists public.school_content (
  school_id    uuid not null references public.schools(id) on delete cascade,
  topic_id     text not null references public.content_topics(id) on delete cascade,
  visible      boolean not null default true,
  exam_weight  smallint not null default 0 check (exam_weight between 0 and 5), -- teacher-set priority
  note         text not null default '',
  updated_by   uuid references public.profiles(id) on delete set null,
  updated_at   timestamptz not null default now(),
  primary key (school_id, topic_id)
);

-- Syllabus/exam weights a teacher adds ("very likely in the exam").
create table if not exists public.teacher_marks (
  id           uuid primary key default gen_random_uuid(),
  teacher_id   uuid not null references public.profiles(id) on delete cascade,
  school_id    uuid not null references public.schools(id) on delete cascade,
  class_level  smallint not null,
  subject      text not null,
  topic_id     text references public.content_topics(id) on delete cascade,
  kind         text not null default 'priority' check (kind in ('priority','removed','formula','note')),
  body         text not null default '' check (char_length(body) <= 2000),
  created_at   timestamptz not null default now()
);
create index if not exists teacher_marks_scope on public.teacher_marks (school_id, class_level, subject);

-- ------------------------------------------------------------- study data ----
create table if not exists public.study_events (
  id           bigserial primary key,
  student_id   uuid not null references public.profiles(id) on delete cascade,
  school_id    uuid references public.schools(id) on delete cascade,
  class_level  smallint,
  subject      text not null default '',
  topic_id     text,
  kind         text not null default 'answer' check (kind in ('answer','tutor','practice','mock','question')),
  correct      boolean,
  source       text not null default 'student' check (source in ('student','teacher','tutor')),
  detail       jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists study_events_student on public.study_events (student_id, created_at desc);
create index if not exists study_events_class on public.study_events (school_id, class_level, subject, created_at desc);

-- One row per (class, subject) the platform supports, so the school and teacher
-- screens can offer real choices instead of free text.
create table if not exists public.subjects (
  class_level  smallint not null,
  subject      text not null,
  title        text not null,
  title_hi     text not null default '',
  primary key (class_level, subject)
);

insert into public.subjects (class_level, subject, title, title_hi) values
  (10, 'science',  'Science',  'विज्ञान'),
  (10, 'maths',    'Mathematics', 'गणित'),
  (10, 'social',   'Social Science', 'सामाजिक विज्ञान'),
  (10, 'hindi',    'Hindi', 'हिंदी'),
  (10, 'english',  'English', 'अंग्रेज़ी'),
  (12, 'physics',  'Physics', 'भौतिकी'),
  (12, 'chemistry','Chemistry', 'रसायन विज्ञान'),
  (12, 'maths',    'Mathematics', 'गणित'),
  (12, 'english',  'English', 'अंग्रेज़ी'),
  (12, 'accountancy', 'Accountancy', 'लेखाशास्त्र')
on conflict (class_level, subject) do update set title = excluded.title, title_hi = excluded.title_hi;

-- -------------------------------------------------------------- RLS setup ----
alter table public.schools        enable row level security;
alter table public.profiles       enable row level security;
alter table public.teaching       enable row level security;
alter table public.class_groups   enable row level security;
alter table public.enrolments     enable row level security;
alter table public.content_topics enable row level security;
alter table public.school_content enable row level security;
alter table public.teacher_marks  enable row level security;
alter table public.study_events   enable row level security;
alter table public.subjects       enable row level security;

-- Helper functions run as the table owner and are used inside policies. They
-- never accept a role or school from the caller.
create or replace function public.current_role_name()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.current_school_id()
returns uuid language sql stable security definer set search_path = public as $$
  select school_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'owner' from public.profiles where id = auth.uid()), false)
$$;

-- A school is usable only while the school AND the profile are active.
create or replace function public.profile_active()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select p.status = 'active' and (p.school_id is null or s.status = 'active')
    from public.profiles p left join public.schools s on s.id = p.school_id
    where p.id = auth.uid()
  ), false)
$$;

-- ------------------------------------------------------------- policies ------
-- Profiles: a person reads their own row; teachers read students/teachers of
-- their own school; the owner reads everything. Writes go through the server
-- (service role) except the few self-service columns below.
drop policy if exists profiles_read_self on public.profiles;
create policy profiles_read_self on public.profiles for select using (id = auth.uid());
drop policy if exists profiles_read_same_school on public.profiles;
create policy profiles_read_same_school on public.profiles for select using (
  public.is_owner() or (
    public.profile_active()
    and school_id is not null and school_id = public.current_school_id()
    and public.current_role_name() in ('teacher','student')
  )
);
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- Schools: members see their school; the owner sees and edits all.
drop policy if exists schools_read_member on public.schools;
create policy schools_read_member on public.schools for select using (
  public.is_owner() or (public.profile_active() and id = public.current_school_id())
);
drop policy if exists schools_owner_write on public.schools;
create policy schools_owner_write on public.schools for update using (public.is_owner()) with check (public.is_owner());

-- Teaching / groups / enrolments: same-school read, owner all.
do $$
declare t text;
begin
  foreach t in array array['teaching','class_groups','enrolments'] loop
    execute format('drop policy if exists %I_read on public.%I', t, t);
    execute format('drop policy if exists %I_write on public.%I', t, t);
  end loop;
end $$;

create policy teaching_read on public.teaching for select using (
  public.is_owner() or (public.profile_active() and school_id = public.current_school_id())
);
create policy class_groups_read on public.class_groups for select using (
  public.is_owner() or (public.profile_active() and school_id = public.current_school_id())
);
create policy enrolments_read on public.enrolments for select using (
  public.is_owner() or (
    public.profile_active() and exists (
      select 1 from public.class_groups g
      where g.id = group_id and g.school_id = public.current_school_id()
    )
  )
);

-- Content: published topics are readable by any signed-in active member; the
-- owner sees unpublished rows too. School overrides are read by the school.
drop policy if exists content_read on public.content_topics;
create policy content_read on public.content_topics for select using (
  public.is_owner() or (public.profile_active() and published)
);
drop policy if exists school_content_read on public.school_content;
create policy school_content_read on public.school_content for select using (
  public.is_owner() or (public.profile_active() and school_id = public.current_school_id())
);
drop policy if exists teacher_marks_read on public.teacher_marks;
create policy teacher_marks_read on public.teacher_marks for select using (
  public.is_owner() or (public.profile_active() and school_id = public.current_school_id())
);

-- Study events: a student reads and adds their own; teachers read their school.
drop policy if exists study_events_self on public.study_events;
create policy study_events_self on public.study_events for select using (
  student_id = auth.uid() or public.is_owner() or (
    public.profile_active() and school_id = public.current_school_id() and public.current_role_name() = 'teacher'
  )
);
drop policy if exists study_events_insert_self on public.study_events;
create policy study_events_insert_self on public.study_events for insert with check (
  student_id = auth.uid() and public.profile_active()
);

drop policy if exists subjects_read on public.subjects;
create policy subjects_read on public.subjects for select using (public.is_owner() or public.profile_active());

-- ---------------------------------------------------------- convenience ----
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array['schools','profiles','content_topics','school_content'] loop
    execute format('drop trigger if exists %I_touch on public.%I', t, t);
    execute format('create trigger %I_touch before update on public.%I for each row execute function public.touch_updated_at()', t, t);
  end loop;
end $$;
