create table if not exists public.soa_fulfillments (
 session_id text primary key, email text not null, status text not null,
 file_names jsonb not null, token_hash text unique, expires_at timestamptz,
 sent_at timestamptz, created_at timestamptz not null default now()
);
alter table public.soa_fulfillments drop constraint if exists soa_fulfillments_status_check;
alter table public.soa_fulfillments add constraint soa_fulfillments_status_check check(status in ('processing','sent','failed','revoked','review'));
alter table public.soa_fulfillments add column if not exists lease_id uuid;
alter table public.soa_fulfillments add column if not exists lease_until timestamptz;
alter table public.soa_fulfillments add column if not exists attempts integer not null default 0;
alter table public.soa_fulfillments add column if not exists next_attempt_at timestamptz not null default now();
alter table public.soa_fulfillments add column if not exists payment_intent text;
alter table public.soa_fulfillments add column if not exists email_payload jsonb;
alter table public.soa_fulfillments add column if not exists provider_id text;
alter table public.soa_fulfillments add column if not exists last_error text;
alter table public.soa_fulfillments enable row level security;
revoke all on public.soa_fulfillments from anon, authenticated;
create index if not exists soa_fulfillments_recovery_idx on public.soa_fulfillments(status,next_attempt_at);
create index if not exists soa_fulfillments_payment_idx on public.soa_fulfillments(payment_intent);
create or replace function public.soa_claim(p_session text,p_email text,p_files jsonb,p_payment text,p_lease uuid)
returns setof public.soa_fulfillments language plpgsql security definer set search_path=public as $$
begin
 return query insert into public.soa_fulfillments as f(session_id,email,file_names,payment_intent,status,lease_id,lease_until,attempts)
 values(p_session,p_email,p_files,p_payment,'processing',p_lease,now()+interval '2 minutes',1)
 on conflict(session_id) do update set status='processing',lease_id=p_lease,lease_until=now()+interval '2 minutes',attempts=f.attempts+1
 where (f.status='failed' and f.next_attempt_at<=now()) or (f.status='processing' and (f.lease_until is null or f.lease_until<now()))
 returning f.*;
end;$$;
revoke all on function public.soa_claim(text,text,jsonb,text,uuid) from public,anon,authenticated;
grant execute on function public.soa_claim(text,text,jsonb,text,uuid) to service_role;
