-- Idempotent schema for the server-only room store. No browser table/RPC access.
create table if not exists public.laplab_rooms (
 id uuid primary key,
 version bigint not null default 0,
 body jsonb not null,
 expires_at timestamptz not null
);
create index if not exists laplab_rooms_expiry on public.laplab_rooms(expires_at);
alter table public.laplab_rooms enable row level security;
revoke all on public.laplab_rooms from anon, authenticated;
grant all on public.laplab_rooms to service_role;

create table if not exists public.laplab_rate_limits (
 key text primary key,
 hits integer not null,
 expires_at timestamptz not null
);
alter table public.laplab_rate_limits enable row level security;
revoke all on public.laplab_rate_limits from anon, authenticated;
grant all on public.laplab_rate_limits to service_role;

create or replace function public.laplab_room_cas(p_id uuid, p_version bigint, p_body jsonb)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare affected integer;
begin
 update public.laplab_rooms set version=p_version+1,
 body=jsonb_set(p_body,'{version}',to_jsonb(p_version+1))
 where id=p_id and version=p_version and expires_at>now();
 get diagnostics affected = row_count;
 return affected=1;
end;
$$;
revoke all on function public.laplab_room_cas(uuid,bigint,jsonb) from public, anon, authenticated;
grant execute on function public.laplab_room_cas(uuid,bigint,jsonb) to service_role;

create or replace function public.laplab_rate_check(p_key text, p_limit integer, p_window integer)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare count_now integer;
begin
 insert into public.laplab_rate_limits(key,hits,expires_at)
 values(p_key,1,now()+make_interval(secs=>p_window))
 on conflict(key) do update set
 hits=case when public.laplab_rate_limits.expires_at<=now() then 1 else public.laplab_rate_limits.hits+1 end,
 expires_at=case when public.laplab_rate_limits.expires_at<=now() then now()+make_interval(secs=>p_window) else public.laplab_rate_limits.expires_at end
 returning hits into count_now;
 return count_now<=p_limit;
end;
$$;
revoke all on function public.laplab_rate_check(text,integer,integer) from public, anon, authenticated;
grant execute on function public.laplab_rate_check(text,integer,integer) to service_role;

create or replace function public.laplab_cleanup()
returns void language sql security invoker set search_path = '' as $$
 delete from public.laplab_rooms where expires_at<=now();
 delete from public.laplab_rate_limits where expires_at<=now();
$$;
revoke all on function public.laplab_cleanup() from public, anon, authenticated;
grant execute on function public.laplab_cleanup() to service_role;
