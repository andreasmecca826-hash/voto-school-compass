insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('circulars', 'circulars', false, 26214400, array['application/pdf']::text[])
on conflict (id) do update set
  public = false,
  file_size_limit = 26214400,
  allowed_mime_types = array['application/pdf']::text[];
