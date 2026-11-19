create table if not exists public.school_data_snapshots (
  user_id uuid primary key references auth.users (id) on delete cascade,
  snapshot jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.school_data_snapshots enable row level security;

revoke all on table public.school_data_snapshots from public, anon;
grant select, insert, update on table public.school_data_snapshots to authenticated;
grant all on table public.school_data_snapshots to service_role;

drop policy if exists school_data_snapshots_select_own on public.school_data_snapshots;
create policy school_data_snapshots_select_own
  on public.school_data_snapshots
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists school_data_snapshots_insert_own on public.school_data_snapshots;
create policy school_data_snapshots_insert_own
  on public.school_data_snapshots
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists school_data_snapshots_update_own on public.school_data_snapshots;
create policy school_data_snapshots_update_own
  on public.school_data_snapshots
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
