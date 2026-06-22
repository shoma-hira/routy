alter table public.posts
  add column if not exists transport_type text;

alter table public.posts
  drop constraint if exists posts_transport_type_check;

alter table public.posts
  add constraint posts_transport_type_check
  check (transport_type in ('walking', 'public_transport', 'car'));

alter table public.posts
  alter column transport_type set default 'public_transport';

-- Keep existing rows nullable for compatibility. The app treats null as public_transport.
-- If you want DB-level required values for all future inserts after confirming existing data:
-- update public.posts set transport_type = 'public_transport' where transport_type is null;
-- alter table public.posts alter column transport_type set not null;
