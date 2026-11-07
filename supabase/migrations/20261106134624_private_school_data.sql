create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table if not exists private.school_data_access (
  singleton boolean primary key default true check (singleton),
  owner_user_id uuid,
  claim_code_hash text,
  claimed_at timestamptz
);

alter table private.school_data_access enable row level security;
revoke all on table private.school_data_access from public, anon, authenticated;
grant all on table private.school_data_access to service_role;

insert into private.school_data_access (singleton, owner_user_id, claim_code_hash)
values (true, null, 'cdf169c4ec8fa3a75a7edd275742d5f67ecb14bdae019967f9deb0da2ac2154c')
on conflict (singleton) do nothing;

create or replace function public.claim_school_data_access(p_user_id uuid, p_claim_code_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_rows integer := 0;
begin
  if exists (
    select 1 from private.school_data_access
    where singleton = true and owner_user_id = p_user_id
  ) then
    return true;
  end if;

  update private.school_data_access
  set owner_user_id = p_user_id,
      claim_code_hash = null,
      claimed_at = pg_catalog.now()
  where singleton = true
    and owner_user_id is null
    and claim_code_hash = p_claim_code_hash;

  get diagnostics affected_rows = row_count;
  return affected_rows = 1;
end;
$$;

create or replace function public.is_school_data_owner(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.school_data_access
    where singleton = true and owner_user_id = p_user_id
  );
$$;

revoke all on function public.claim_school_data_access(uuid, text) from public, anon, authenticated;
revoke all on function public.is_school_data_owner(uuid) from public, anon, authenticated;
grant execute on function public.claim_school_data_access(uuid, text) to service_role;
grant execute on function public.is_school_data_owner(uuid) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('school-data', 'school-data', false, 26214400, array['application/json', 'text/markdown']::text[])
on conflict (id) do update set
  public = false,
  file_size_limit = 26214400,
  allowed_mime_types = array['application/json', 'text/markdown']::text[];
