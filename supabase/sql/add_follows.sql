-- Add MVP follow relationships between public profiles.
-- Review and run manually from the Supabase SQL Editor.

begin;

create table if not exists public.follows (
  follower_id uuid not null,
  following_id uuid not null,
  created_at timestamptz not null default now()
);

alter table public.follows
  add column if not exists follower_id uuid,
  add column if not exists following_id uuid,
  add column if not exists created_at timestamptz not null default now();

alter table public.follows
  alter column follower_id set not null,
  alter column following_id set not null,
  alter column created_at set not null,
  alter column created_at set default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.follows'::regclass
      and conname = 'follows_pkey'
  ) then
    alter table public.follows
      add constraint follows_pkey primary key (follower_id, following_id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.follows'::regclass
      and conname = 'follows_no_self_follow'
  ) then
    alter table public.follows
      add constraint follows_no_self_follow
      check (follower_id <> following_id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.follows'::regclass
      and conname = 'follows_follower_id_fkey'
  ) then
    alter table public.follows
      add constraint follows_follower_id_fkey
      foreign key (follower_id)
      references public.profiles(id)
      on delete cascade;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.follows'::regclass
      and conname = 'follows_following_id_fkey'
  ) then
    alter table public.follows
      add constraint follows_following_id_fkey
      foreign key (following_id)
      references public.profiles(id)
      on delete cascade;
  end if;
end;
$$;

alter table public.follows enable row level security;

drop policy if exists follows_select_authenticated on public.follows;
create policy follows_select_authenticated
on public.follows
for select
to authenticated
using (true);

drop policy if exists follows_insert_own on public.follows;
create policy follows_insert_own
on public.follows
for insert
to authenticated
with check (auth.uid() = follower_id);

drop policy if exists follows_delete_own on public.follows;
create policy follows_delete_own
on public.follows
for delete
to authenticated
using (auth.uid() = follower_id);

commit;
