-- Run in your Supabase project's SQL editor before enabling the webhook.
create table if not exists public.soa_fulfillments (
 session_id text primary key,
 email text not null,
 status text not null check(status in ('processing','sent','failed')),
 file_names jsonb not null,
 token_hash text unique,
 expires_at timestamptz,
 sent_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.soa_fulfillments enable row level security;
-- No anon/authenticated access policies. Access via server-side service role only.
create index if not exists soa_fulfillments_status_idx on public.soa_fulfillments(status,created_at);
-- NOTE: Reconcile stale 'processing' orders; webhook retries cannot reclaim a row
-- after a failed send. This is a safe fail-closed baseline, not full retry automation.
