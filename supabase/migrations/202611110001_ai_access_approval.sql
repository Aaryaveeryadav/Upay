-- Private approval records. Only the server-side service role may call RPCs.
create table if not exists public.upay_ai_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  status text not null default 'pending' check(status in ('pending','approved','revoked')),
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users(id) on delete set null
);
create table if not exists public.upay_ai_access_audit (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  actor_id uuid not null,
  status text not null check(status in ('approved','revoked')),
  created_at timestamptz not null default now()
);
alter table public.upay_ai_access enable row level security;
alter table public.upay_ai_access_audit enable row level security;
revoke all on public.upay_ai_access,public.upay_ai_access_audit from public,anon,authenticated;

create or replace function public.upay_ai_access_status(p_user uuid)
returns jsonb language sql security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('status',coalesce((select status from public.upay_ai_access where user_id=p_user),'none'));
$$;
create or replace function public.upay_ai_access_request(p_user uuid,p_email text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if p_user is null or p_email is null or length(p_email)>320 then raise exception 'invalid account'; end if;
 insert into public.upay_ai_access(user_id,email) values(p_user,p_email)
 on conflict(user_id) do update set email=excluded.email;
 -- A repeated request must NEVER undo revocation or promote pending access.
 return public.upay_ai_access_status(p_user);
end $$;
create or replace function public.upay_ai_access_list()
returns jsonb language sql security definer set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from (
   select user_id,email,status,requested_at,decided_at from public.upay_ai_access
   order by requested_at desc limit 200
 ) r;
$$;
create or replace function public.upay_ai_access_decide(p_user uuid,p_actor uuid,p_status text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if p_user is null or p_actor is null or p_status not in ('approved','revoked') then raise exception 'invalid decision'; end if;
 update public.upay_ai_access set status=p_status,decided_at=now(),decided_by=p_actor where user_id=p_user;
 if not found then raise exception 'access request not found'; end if;
 insert into public.upay_ai_access_audit(user_id,actor_id,status) values(p_user,p_actor,p_status);
 return public.upay_ai_access_status(p_user);
end $$;
revoke all on function public.upay_ai_access_status(uuid), public.upay_ai_access_request(uuid,text), public.upay_ai_access_list(), public.upay_ai_access_decide(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.upay_ai_access_status(uuid), public.upay_ai_access_request(uuid,text), public.upay_ai_access_list(), public.upay_ai_access_decide(uuid,uuid,text) to service_role;
