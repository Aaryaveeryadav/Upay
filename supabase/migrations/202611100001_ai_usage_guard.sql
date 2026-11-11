-- Apply through an authorized Supabase administrator. Not automatically deployed.
-- Counts attempted provider calls, not tokens or money. Rejected provider calls
-- still count; this avoids refund races and repeated quota-error requests.
create table if not exists public.upay_ai_daily_usage (
  day date not null,
  scope text not null,
  calls integer not null default 0,
  primary key (day, scope)
);
alter table public.upay_ai_daily_usage enable row level security;
revoke all on public.upay_ai_daily_usage from public, anon, authenticated;

create or replace function public.upay_consume_ai_call(
  p_user uuid, p_user_limit integer, p_global_limit integer
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  d date := (now() at time zone 'UTC')::date;
  u integer;
  g integer;
  seconds integer;
begin
  if p_user is null or p_user_limit < 1 or p_global_limit < 1 then
    raise exception 'invalid usage policy';
  end if;
  -- Serialize the check + increment across users and function instances.
  perform pg_advisory_xact_lock(742198562);
  insert into public.upay_ai_daily_usage(day,scope) values(d,'global'),(d,p_user::text)
    on conflict do nothing;
  select calls into u from public.upay_ai_daily_usage where day=d and scope=p_user::text;
  select calls into g from public.upay_ai_daily_usage where day=d and scope='global';
  seconds := ceil(extract(epoch from (((d + 1)::timestamp at time zone 'UTC') - now())))::integer;
  if u >= p_user_limit or g >= p_global_limit then
    return jsonb_build_object('allowed',false,'retryAfter',greatest(1,seconds));
  end if;
  update public.upay_ai_daily_usage set calls=calls+1 where day=d and scope in ('global',p_user::text);
  return jsonb_build_object('allowed',true,'userCalls',u+1,'globalCalls',g+1,
    'alert',g+1=greatest(1,ceil(p_global_limit*0.8)::integer));
end $$;
revoke all on function public.upay_consume_ai_call(uuid,integer,integer) from public, anon, authenticated;
grant execute on function public.upay_consume_ai_call(uuid,integer,integer) to service_role;
