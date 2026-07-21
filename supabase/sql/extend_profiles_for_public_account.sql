-- Extend public.profiles for ROUTY public accounts.
-- Review and run manually from the Supabase SQL Editor.
-- This migration intentionally keeps username nullable for existing users.

begin;

alter table public.profiles
  add column if not exists username text,
  add column if not exists bio text,
  add column if not exists hobby_tags text[],
  add column if not exists profile_completed boolean default false,
  add column if not exists updated_at timestamptz default now();

-- Keep the migration safe if a partially applied schema already has nullable values.
update public.profiles
set profile_completed = false
where profile_completed is null;

alter table public.profiles
  alter column profile_completed set default false,
  alter column profile_completed set not null,
  alter column updated_at set default now();

-- Usernames are stored without "@" and must already be normalized to lowercase.
-- The partial index allows existing users to remain username-less during rollout.
create unique index if not exists profiles_username_lower_unique_idx
  on public.profiles (lower(username))
  where username is not null;

-- PostgreSQL CHECK constraints cannot contain subqueries directly, so keep the
-- hobby-tag validation in one immutable helper used only by the constraint.
create or replace function public.profile_hobby_tags_are_valid(tags text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    tags is null
    or (
      cardinality(tags) <= 5
      and not exists (
        select 1
        from unnest(tags) as item(value)
        where value is null
          or btrim(value) = ''
          or char_length(value) > 20
      )
      and (
        select count(*)
        from unnest(tags) as item(value)
      ) = (
        select count(distinct lower(btrim(value)))
        from unnest(tags) as item(value)
      )
    );
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_display_name_length_check'
  ) then
    alter table public.profiles
      add constraint profiles_display_name_length_check
      check (
        display_name is null
        or char_length(btrim(display_name)) between 1 and 30
      ) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_username_length_check'
  ) then
    alter table public.profiles
      add constraint profiles_username_length_check
      check (
        username is null
        or char_length(username) between 3 and 20
      ) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_username_format_check'
  ) then
    alter table public.profiles
      add constraint profiles_username_format_check
      check (
        username is null
        or (
          username = lower(username)
          and username ~ '^[a-z0-9_]+$'
        )
      ) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_bio_length_check'
  ) then
    alter table public.profiles
      add constraint profiles_bio_length_check
      check (bio is null or char_length(bio) <= 160) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_hobby_tags_check'
  ) then
    alter table public.profiles
      add constraint profiles_hobby_tags_check
      check (public.profile_hobby_tags_are_valid(hobby_tags)) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_completed_fields_check'
  ) then
    alter table public.profiles
      add constraint profiles_completed_fields_check
      check (
        not profile_completed
        or (
          display_name is not null
          and char_length(btrim(display_name)) between 1 and 30
          and username is not null
          and char_length(username) between 3 and 20
          and username = lower(username)
          and username ~ '^[a-z0-9_]+$'
        )
      ) not valid;
  end if;
end;
$$;

comment on column public.profiles.username is
  'Public username without @. Nullable until existing users complete onboarding.';
comment on column public.profiles.bio is 'Public profile biography, up to 160 characters.';
comment on column public.profiles.hobby_tags is
  'Public hobby tags. At most five unique, non-empty tags of up to 20 characters.';
comment on column public.profiles.profile_completed is
  'True after the user completes the ROUTY profile form.';

-- RLS is deliberately unchanged in STEP 1.
-- Before making profiles readable by anonymous users, review the existing policies
-- and column privileges carefully: RLS filters rows, not columns, and profiles.email
-- must never be exposed by a public profile query. Prefer a public view or RPC that
-- selects only id, display_name, username, bio, avatar_url, hobby_tags and updated_at.
-- Any SELECT/UPDATE policy changes must be reviewed and applied in a later step.

commit;
